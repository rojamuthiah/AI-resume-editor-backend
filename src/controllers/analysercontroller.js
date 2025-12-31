const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const UserResume = require("../models/UserResume");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash"
});

exports.analyzeResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId, jobDescription } = req.body;

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

    let responseText = result.response.text();

    // Safety: parse JSON strictly
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (err) {
      console.error("Invalid AI JSON:", responseText);
      return res.status(500).json({
        error: "AI returned invalid JSON"
      });
    }

    return res.json(parsed);

  } catch (err) {
    console.error("Resume Analyzer Error:", err);
    res.status(500).json({
      error: "Resume analysis failed",
      details: err.message
    });
  }
};
