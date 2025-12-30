const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

const ResumeConversation = require("../models/resumeConversation");
const UserResume = require("../models/UserResume");
const { createConversation, getConversation } = require("../utils/conversationHelper");
const {EDIT_AGENT_PROMPT} = require("../prompt/systemPrompt")

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

exports.aiSuggestionsEdit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt, resumeId, conversationId } = req.body;

    /* ================= VALIDATION ================= */
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

    /* ================= FETCH RESUME ================= */
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

    /* ================= CONVERSATION ================= */
    let convo;

    if (conversationId) {
      convo = await getConversation(userId, resumeId, conversationId);
      if (!convo) {
        return res.status(404).json({
          error: "Conversation not found"
        });
      }
    } else {
      convo = await createConversation(
        userId,
        resumeId,
        prompt.slice(0, 80)
      );
    }

    /* ================= SAVE USER MESSAGE ================= */
    await ResumeConversation.findByIdAndUpdate(convo._id, {
      $push: {
        messages: {
          role: "user",
          type: "edit",
          content: prompt
        }
      }
    });

    /* ================= BUILD HISTORY ================= */
    const lastMessages = (convo.messages || []).slice(-3);

    const history = lastMessages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{
        text: `[${msg.type.toUpperCase()} MODE] ${msg.content}`
      }]
    }));

    /* ================= SYSTEM PROMPT ================= */
    const systemPrompt = EDIT_AGENT_PROMPT;

    const userPrompt = `
USER EDIT REQUEST:
${prompt}

CURRENT RESUME JSON:
${JSON.stringify(resumeJson, null, 2)}

Return JSON only.
`;

    /* ================= AI CALL ================= */
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...history,
        { role: "user", parts: [{ text: userPrompt }] }
      ]
    });

    const raw = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);

    if (!parsed.messageinfo || !Array.isArray(parsed.keys) || !parsed.edits) {
      throw new Error("Invalid AI response structure");
    }

    /* ================= SAVE AI MESSAGE ================= */
    await ResumeConversation.findByIdAndUpdate(convo._id, {
      $push: {
        messages: {
          role: "assistant",
          type: "edit",
          content: JSON.stringify(parsed)
        }
      }
    });

    return res.json({
      message: parsed,
      conversationId: convo.conversationId,
      title: convo.title
    });

  } catch (err) {
    console.error("AI Suggestions Edit Error:", err);
    return res.status(500).json({
      error: "AI edit failed",
      details: err.message
    });
  }
};
