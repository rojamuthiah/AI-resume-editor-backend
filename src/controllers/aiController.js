// controllers/editController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ResumeConversation = require("../models/resumeConversation");
const UserResume = require("../models/UserResume");
const {
  createConversation,
  getConversation,
} = require("../utils/conversationHelper");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

exports.editAI = async (req, res) => {
  try {
    const {
      prompt,
      resumeJson,
      templateKey,
      conversationId,
    } = req.body;
    const userId = req.user.id;

    if (!prompt || !resumeJson || !templateKey) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1️⃣ Load or create conversation history
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

    const history = (convo?.messages || []).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // 2️⃣ Save user's edit message BEFORE request
    await ResumeConversation.findByIdAndUpdate(convo._id, {
      $push: {
        messages: {
          role: "user",
          type: "edit",
          content: prompt
        }
      }
    });

    // 3️⃣ Your EXACT existing prompts (UNCHANGED)
    const systemPrompt = `
You are an ATS-optimized resume rewriting engine.
You MUST ALWAYS return valid JSON. NEVER return markdown, no backticks.

### TASK
Analyze the user's prompt and determine which sections of the resume need improvement.

Allowed sections:
- name
- email
- phone
- portfolio
- github
- education
- skills
- experience
- projects
- publications
- awards
- volunteer

Rewrite only the sections the user implies or directly asks for.

### OUTPUT FORMAT ( ALWAYS FOLLOW EXACTLY THIS FORMAT )

{
  "sections": [
    {
      "name": "<section-name>",
      "old": { "<section-name>": <old-section-json> },
      "new": { "<section-name>": <new-section-json> }
    }
  ],
  "message": "<short progress note>"
}

### RULES
- "sections" must be an array; include 1 or many items depending on user request.
- Keep the exact JSON shape of the user’s resume. No new fields.
- For experience/projects: use quantifiable, ATS-optimized bullet points.
- For skills: keep category → array structure.
- NEVER include explanations outside the JSON.
- ALWAYS return valid JSON that can be parsed by JSON.parse().
`;

    const userPrompt = `
USER PROMPT:
${prompt}

FULL RESUME JSON:
${JSON.stringify(resumeJson, null, 2)}

Return only JSON:
`;

    // 4️⃣ Gemini API call with history (use proper { contents: [...] } shape)
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...history,
        { role: "user", parts: [{ text: userPrompt }] }
      ]
    });

    let text = result.response.text();
    text = text.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(text); // final validated JSON

    // 5️⃣ Save AI response
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
      ...parsed,
      conversationId: convo.conversationId,
      title: convo.title,
    });
  } catch (err) {
    console.error("Gemini AI Error:", err);
    return res.status(500).json({ error: "AI failed", details: err.message });
  }
};

exports.acceptEdit = async (req, res) => {
  try {
    const {
      templateKey,
      resumeJson,
      conversationId,
    } = req.body;
    const userId = req.user.id;

    if (!templateKey || !resumeJson) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const updated = await UserResume.findOneAndUpdate(
      { userId, templateKey },
      { resumeJson, lastUpdated: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Resume not found" });
    }

    return res.json({ success: true, resumeJson: updated.resumeJson });
  } catch (err) {
    console.error("Accept Edit Error:", err);
    return res.status(500).json({ error: "accept failed", details: err.message });
  }
};
