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

exports.analyzeResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId, jobDescription, conversationId } = req.body;

    // ───────────────── Validation ─────────────────
    if (!resumeId || !jobDescription) {
      return res.status(400).json({
        error: "resumeId and jobDescription are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        error: "Invalid resumeId"
      });
    }

    // ───────────────── Fetch Resume ─────────────────
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

    // ───────────────── Conversation handling ─────────────────
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
        "Analyze My Resume"
      );
    }

    // ───────────────── SYSTEM PROMPT ─────────────────
    const systemPrompt = `
You are an extremely strict ATS Resume Analyzer.

You must return ONLY valid JSON.
No markdown. No explanations outside JSON.

Evaluate how relevant the resume is for the given job description.

Rules:
- Score out of 100 (be strict, no generosity)
- If job description is NOT a real JD (random text, greeting, nonsense):
  - relevanceScore: 5
  - improvements: []
  - strengths: []
  - finalVerdict: explain that JD is invalid

JSON format (exact keys only):
{
  "relevanceScore": number,
  "improvements": string[],
  "strengths": string[],
  "finalVerdict": string
}
`;

    // ───────────────── AI Call ─────────────────
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        {
          role: "user",
          parts: [
            {
              text: `
Resume JSON:
${JSON.stringify(resumeJson, null, 2)}

Job Description:
${jobDescription}
`
            }
          ]
        }
      ]
    });

    const responseText = result.response.text();

    // ───────────────── Strict JSON Parse ─────────────────
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (err) {
      console.error("Invalid AI JSON:", responseText);
      return res.status(500).json({
        error: "AI returned invalid JSON"
      });
    }

    // ───────────────── Save to Conversation (Analyse type) ─────────────────
    await ResumeConversation.findByIdAndUpdate(
      convo._id,
      {
        $push: {
          messages: {
            $each: [
              {
                role: "user",
                type: "analyse",
                content: JSON.stringify({
                  action: "Analyze my resume",
                  jobDescription
                })
              },
              {
                role: "assistant",
                type: "analyse",
                content: responseText // RAW JSON STRING
              }
            ]
          }
        }
      }
    );

    // ───────────────── Response ─────────────────
    return res.json({
      analysis: parsed,
      conversationId: convo.conversationId,
      title: convo.title
    });

  } catch (err) {
    console.error("Resume Analyzer Error:", err);
    res.status(500).json({
      error: "Resume analysis failed",
      details: err.message
    });
  }
};


exports.getResumeAnalyses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId } = req.params;
    const { conversationId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ error: "Invalid resumeId" });
    }

    const resume = await UserResume.findOne({
      _id: resumeId,
      userId
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const query = { userId, resumeId };
    if (conversationId) query.conversationId = conversationId;

    const conversations = await ResumeConversation.find(query)
      .select("conversationId title messages createdAt")
      .sort({ createdAt: 1 });

    const analyses = conversations
      .map(c => ({
        conversationId: c.conversationId,
        title: c.title,
        createdAt: c.createdAt,
        messages: (c.messages || []).filter(
          m => m.type === "analyse"
        )
      }))
      .filter(c => c.messages.length > 0);

    return res.json({ resumeId, analyses });
  } catch (err) {
    console.error("Get Resume Analyses Error:", err);
    res.status(500).json({
      error: "Failed to fetch analyses"
    });
  }
};
