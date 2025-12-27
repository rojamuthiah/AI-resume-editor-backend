const { GoogleGenerativeAI } = require("@google/generative-ai");
const ResumeConversation = require("../models/resumeConversation");
const UserResume = require("../models/UserResume");
const { createConversation, getConversation } = require("../utils/conversationHelper");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

exports.aiSuggestionsEdit = async (req, res) => {
  try {
    const { prompt, resumeJson, templateKey, conversationId } = req.body;
    const userId = req.user.id;

    if (!prompt || !resumeJson || !templateKey) {
      return res.status(400).json({ error: "Missing fields" });
    }

    /** 1️⃣ Load or create conversation */
    let convo;
    if (conversationId) {
      convo = await getConversation(userId, templateKey, conversationId);
      if (!convo) return res.status(404).json({ error: "Conversation not found" });
    } else {
      convo = await createConversation(userId, templateKey, prompt.slice(0, 80));
    }

    /** 2️⃣ Save USER message */
    await ResumeConversation.findByIdAndUpdate(convo._id, {
      $push: {
        messages: {
          role: "user",
          type: "edit",
          content: prompt
        }
      }
    });

    /** 3️⃣ SYSTEM PROMPT */
    const systemPrompt = `
You are an ATS resume editor.

STRICT RULES:
- Return ONLY valid JSON
- No markdown, no explanations
- Return ONLY sections that changed
- Each section must be FULL replacement

ALLOWED SECTIONS:
summary, name, email, phone, portfolio, github,
education, skills, experience, projects,
publications, awards, volunteer

OUTPUT FORMAT:

{
  "output": {
    "keys": ["section1", "section2"],
    "section1": <FULL SECTION JSON>,
    "section2": <FULL SECTION JSON>
  },
  "message": "<short summary>"
}
`;

    const userPrompt = `
USER REQUEST:
${prompt}

CURRENT RESUME JSON:
${JSON.stringify(resumeJson, null, 2)}

Return JSON only.
`;

    /** 4️⃣ Gemini call */
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: userPrompt }] }
      ]
    });

    let text = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

    if (!parsed.output || !Array.isArray(parsed.output.keys)) {
      throw new Error("Invalid AI response shape");
    }

    /** 5️⃣ Save ASSISTANT message (STRINGIFIED OBJECT) */
    await ResumeConversation.findByIdAndUpdate(convo._id, {
      $push: {
        messages: {
          role: "assistant",
          type: "edit",
          content: JSON.stringify(parsed)
        }
      }
    });

    /** 6️⃣ Merge updated sections */
    const updatedResume = { ...resumeJson };
    parsed.output.keys.forEach((key) => {
      updatedResume[key] = parsed.output[key];
    });

    return res.json({
      output: parsed.output,
      message: parsed.message,
      updatedResume,
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
