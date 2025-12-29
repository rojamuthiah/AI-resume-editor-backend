const { GoogleGenerativeAI } = require("@google/generative-ai");
const ResumeConversation = require("../models/resumeConversation");
const UserResume = require("../models/UserResume");
const {
  createConversation,
  getConversation,
} = require("../utils/conversationHelper");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash"
});

exports.askAI = async (req, res) => {
  try {
    const {
      prompt,
      templateKey,
      category,
      conversationId,
    } = req.body;
    const userId = req.user.id;

    if (!templateKey || !category || !prompt) {
      return res.status(400).json({ error: "Missing templateKey, category, or prompt" });
    }

    // FETCH RESUME FROM DB WITH CATEGORY
    const userResume = await UserResume.findOne({ userId, templateKey, category });
    if (!userResume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const resumeJson = userResume.resumeJson;

    // Find or create conversation
    let convo = null;
    if (conversationId) {
      convo = await getConversation(userId, templateKey, conversationId);
      if (!convo) {
        return res.status(404).json({ error: "Conversation not found" });
      }
    } else {
      const title = String(prompt).slice(0, 80);
      convo = await createConversation(userId, templateKey, title);
    }

    // Filter only "ask" type messages and get last 3 conversations (6 messages: 3 user + 3 ai)
    const askMessages = (convo?.messages || []).filter(msg => msg.type === "ask");
    const lastThreeMessages = askMessages.slice(-6);

    // Convert conversation to Gemini format
    const history = lastThreeMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // Add the new user message to the conversation immediately
    await ResumeConversation.findByIdAndUpdate(
      convo._id,
      {
        $push: {
          messages: {
            role: "user",
            type: "ask",
            content: prompt
          }
        }
      },
      { upsert: true }
    );

    // Gemini request with system prompt for ask mode
    const systemPrompt = `You are an ATS resume assistant. You can help users with:
- Resume critique and feedback
- Questions about resume content
- Job description analysis
- Resume details discussion
- General resume advice

IMPORTANT: If the user asks you to EDIT or MODIFY the resume content, DO NOT do it. Instead, respond with:
"I can help you critique and discuss your resume, but to actually edit and improve sections, please use the Edit Agent mode. There you can request specific improvements to your resume sections, skills, experience, and more. You can also share job descriptions for targeted optimization."

Focus on answering questions and providing insights about the resume only.`;

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...history,
        {
          role: "user",
          parts: [
            {
              text:
                `Resume JSON:\n${JSON.stringify(resumeJson, null, 2)}\n\n` +
                `User question:\n${prompt}`
            }
          ]
        }
      ]
    });

    const text = result.response.text();

    // Store AI reply
    await ResumeConversation.findByIdAndUpdate(
      convo._id,
      {
        $push: {
          messages: {
            role: "assistant",
            type: "ask",
            content: text
          }
        }
      },
      { upsert: true }
    );

    return res.json({
      message: text,
      conversationId: convo.conversationId,
      title: convo.title,
    });
  } catch (err) {
    console.error("Ask AI Error:", err);
    res.status(500).json({ error: "ask failed", details: err.message });
  }
};