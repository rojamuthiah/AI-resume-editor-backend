const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

const ResumeConversation = require("../models/resumeConversation");
const UserResume = require("../models/UserResume");
const {
  createConversation,
  getConversation
} = require("../utils/conversationHelper");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash"
});

exports.askAI = async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt, resumeId, conversationId } = req.body;

    // ─────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────
    if (!prompt || !resumeId) {
      return res.status(400).json({
        error: "prompt and resumeId are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        error: "Invalid resumeId"
      });
    }

    // ─────────────────────────────────────────────
    // Fetch resume ONLY from UserResume by ID
    // ─────────────────────────────────────────────
    const resume = await UserResume.findOne({
      _id: resumeId,
      userId
    });

    if (!resume) {
      return res.status(404).json({
        error: "Resume not found"
      });
    }

    const resumeJson = resume.resumeJson;

    // ─────────────────────────────────────────────
    // Conversation handling (scoped by resumeId)
    // ─────────────────────────────────────────────
    let convo;

    if (conversationId) {
      convo = await getConversation(userId, resumeId, conversationId);
      if (!convo) {
        return res.status(404).json({
          error: "Conversation not found"
        });
      }
    } else {
      const title = String(prompt).slice(0, 80);
      convo = await createConversation(userId, resumeId, title);
    }

    // ─────────────────────────────────────────────
    // Build ASK-only history (last 3 Q/A pairs)
    // ─────────────────────────────────────────────
    const askMessages = (convo.messages || []).filter(
      msg => msg.type === "ask"
    );

    const lastMessages = askMessages.slice(-6);

    const history = lastMessages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // Save user question immediately
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
      }
    );

    // ─────────────────────────────────────────────
    // SYSTEM PROMPT (ASK MODE)
    // ─────────────────────────────────────────────
    const systemPrompt = `
You are an ATS Resume Assistant.

You can:
- Critique resumes
- Answer questions about resume content
- Analyze job descriptions
- Give resume advice

IMPORTANT:
If the user asks to EDIT, MODIFY, or CHANGE resume content,
DO NOT do it.

Respond with:
"I can help you critique and discuss your resume, but to actually edit and improve sections, please use the Edit Agent mode."

Never return JSON. Never modify resume content.
`;

    // ─────────────────────────────────────────────
    // AI Call
    // ─────────────────────────────────────────────
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

    // Save assistant response
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
      }
    );

    return res.json({
      message: text,
      conversationId: convo.conversationId,
      title: convo.title
    });

  } catch (err) {
    console.error("Ask AI Error:", err);
    res.status(500).json({
      error: "ask failed",
      details: err.message
    });
  }
};
