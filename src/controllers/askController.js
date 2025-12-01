// controllers/askController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ResumeConversation = require("../models/resumeConversation");
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
      resumeJson,
      templateKey,
      conversationId,
    } = req.body;
    const userId = req.user.id;

    if (!templateKey || !prompt) {
      return res.status(400).json({ error: "Missing templateKey or prompt" });
    }

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

    // Convert conversation to Gemini format
    const history = (convo?.messages || []).map((msg) => ({
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

    // Gemini request
    const result = await model.generateContent({
      contents: [
        ...history,
        {
          role: "user",
          parts: [
            {
              text:
                `You are an ATS resume assistant.\n\n` +
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
