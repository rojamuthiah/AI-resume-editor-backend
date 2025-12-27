const { GoogleGenerativeAI } = require("@google/generative-ai");
const ResumeConversation = require("../models/resumeConversation");
const UserResume = require("../models/UserResume");
const { createConversation, getConversation } = require("../utils/conversationHelper");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

exports.aiSuggestionsEdit = async (req, res) => {
  try {
    const { prompt, templateKey, conversationId, jobDescription } = req.body;
    const userId = req.user.id;

    if (!prompt || !templateKey) {
      return res.status(400).json({ error: "Missing prompt or templateKey" });
    }

    const resume = await UserResume.findOne({ userId, templateKey });
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const resumeJson = resume.resumeJson;

    let convo;
    if (conversationId) {
      convo = await getConversation(userId, templateKey, conversationId);
      if (!convo) return res.status(404).json({ error: "Conversation not found" });
    } else {
      convo = await createConversation(userId, templateKey, prompt.slice(0, 80));
    }

  
    await ResumeConversation.findByIdAndUpdate(convo._id, {
      $push: {
        messages: {
          role: "user",
          type: "edit",
          content: prompt
        }
      }
    });

   
    const systemPrompt = `
You are an ATS resume editor. Analyze the user's request and current resume, then provide structured edits.

STRICT RULES:
- Return ONLY valid JSON
- Return only the changed sections
- No markdown, no explanations outside JSON
- Extract ATS keywords ONLY if job description is provided
- For each edited section, provide "before" and "after" as arrays of strings (bullet points)
- "before" should be the current content formatted as bullet points
- "after" should be the improved content formatted as bullet points

ALLOWED SECTIONS:
summary, name, email, phone, portfolio, github,
education, skills, experience, projects,
publications, awards, volunteer

OUTPUT FORMAT (EXACT STRUCTURE):

{
  "messageinfo": "Brief description of changes made (2-3 sentences)",
  "keys": ["section1", "section2"],
  "keywords": ["keyword1", "keyword2"],  // ONLY include if job description was provided
  "edits": {
    "section1": {
      "before": ["Current point 1", "Current point 2"],
      "after": ["Improved point 1", "Improved point 2"]
    },
    "section2": {
      "before": ["Current point 1"],
      "after": ["Improved point 1"]
    }
  }
}

IMPORTANT:
- Convert all section content to bullet point arrays for "before" and "after"
- For experience/projects: extract bullet points from points array
- For skills: convert to array format
- For simple fields (name, email): show old value vs new value as single-item arrays
- keywords array should be empty [] if no job description provided
`;

    const userPrompt = `
USER REQUEST:
${prompt}

${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}\n\n` : ''}CURRENT RESUME JSON:
${JSON.stringify(resumeJson, null, 2)}

Return JSON only, following the exact format specified.
`;


    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: userPrompt }] }
      ]
    });

    let text = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

    // Validate structure
    if (!parsed.messageinfo || !Array.isArray(parsed.keys) || !parsed.edits) {
      throw new Error("Invalid AI response structure");
    }

    // Ensure keywords is array (empty if not provided)
    if (!Array.isArray(parsed.keywords)) {
      parsed.keywords = jobDescription ? [] : [];
    }

    // Build the message object
    const messageObject = {
      messageinfo: parsed.messageinfo,
      keys: parsed.keys,
      keywords: parsed.keywords,
      edits: parsed.edits
    };


    await ResumeConversation.findByIdAndUpdate(convo._id, {
      $push: {
        messages: {
          role: "assistant",
          type: "edit",
          content: JSON.stringify(messageObject)
        }
      }
    });

    return res.json({
      message: messageObject, // Send the structured object
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
