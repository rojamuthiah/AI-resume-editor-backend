const { GoogleGenerativeAI } = require("@google/generative-ai");
const ResumeConversation = require("../models/resumeConversation");
const UserResume = require("../models/UserResume");
const { createConversation, getConversation } = require("../utils/conversationHelper");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

exports.aiSuggestionsEdit = async (req, res) => {
  try {
  
    const { prompt, templateKey, category, conversationId } = req.body;
    const userId = req.user.id;

    if (!prompt || !templateKey || !category) {
      return res.status(400).json({ error: "Missing prompt, templateKey, or category" });
    }

    const resume = await UserResume.findOne({ userId, templateKey, category });
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const resumeJson = resume.resumeJson;

    let convo;
    if (conversationId) {
      convo = await getConversation(userId, templateKey, category, conversationId);
      if (!convo) return res.status(404).json({ error: "Conversation not found" });
    } else {
      convo = await createConversation(userId, templateKey, category, prompt.slice(0, 80));
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

    const allMessages = convo?.messages || [];
    const lastThreeMessages = allMessages.slice(-3);

    const history = lastThreeMessages.map((msg) => {
      const msgType = msg.type === "ask" ? "[ASK MODE]" : "[EDIT MODE]";
      const role = msg.role === "user" ? "user" : "model";
      
      return {
        role,
        parts: [{
          text: `${msgType} ${msg.content}`
        }]
      };
    });

    const systemPrompt = `
You are an ATS Resume Editor Agent working in a dual-agent system:

SYSTEM ARCHITECTURE:
1. ASK AGENT MODE: Handles user questions about their resume (critique, advice, job description analysis)
2. EDIT AGENT MODE (YOU): Handles actual modifications and improvements to resume sections

YOUR ROLE:
- You only make EDITS to the resume
- You have context from Ask Agent discussions (messages tagged with [ASK MODE])
- You have context from previous Edit Agent sessions (messages tagged with [EDIT MODE])
- Use this context to understand what improvements the user needs
- You receive clear edit requests from the user or insights from Ask Agent conversations
- Apply structured edits following the exact JSON format specified

STRICT RULES:
- Return ONLY valid JSON
- Return only the changed sections
- No markdown, no explanations outside JSON
- For each edited section, provide "before" and "after" as arrays of strings (bullet points) for display
- ALSO provide "beforeJson" and "afterJson" with the actual JSON structure of the section
- "before" should be the current content formatted as bullet points (for UI display)
- "after" should be the improved content formatted as bullet points (for UI display)
- "beforeJson" should be the exact current JSON structure of the section
- "afterJson" should be the exact new JSON structure of the section

ALLOWED SECTIONS:
summary, name, email, phone, portfolio, github,
education, skills, experience, projects,
publications, awards, volunteer

OUTPUT FORMAT (EXACT STRUCTURE):

{
  "messageinfo": "Brief description of changes made (2-3 sentences)",
  "keys": ["section1", "section2"],
  "keywords": [],
  "edits": {
    "section1": {
      "before": ["Current point 1", "Current point 2"],
      "after": ["Improved point 1", "Improved point 2"],
      "beforeJson": { ... actual JSON structure ... },
      "afterJson": { ... actual JSON structure ... }
    }
  }
}

IMPORTANT - JSON STRUCTURE BY SECTION TYPE:

1. SIMPLE STRING FIELDS (name, email, phone, portfolio, github, summary):
   - "beforeJson": "current string value"
   - "afterJson": "new string value"
   Example:
   {
     "portfolio": {
       "before": ["https://oldportfolio.com"],
       "after": ["https://newportfolio.com"],
       "beforeJson": "https://oldportfolio.com",
       "afterJson": "https://newportfolio.com"
     }
   }

2. ARRAY OF STRINGS (awards):
   - "beforeJson": ["award1", "award2"]
   - "afterJson": ["award1", "award2", "award3"]
   Example:
   {
     "awards": {
       "before": ["Award 1", "Award 2"],
       "after": ["Award 1", "Award 2", "Award 3"],
       "beforeJson": ["Award 1", "Award 2"],
       "afterJson": ["Award 1", "Award 2", "Award 3"]
     }
   }

3. ARRAY OF OBJECTS (education, experience, projects, publications, volunteer):
   - "beforeJson": [{ "title": "...", "description": "...", ... }]
   - "afterJson": [{ "title": "...", "description": "...", ... }]
   Example for projects:
   {
     "projects": {
       "before": ["Project 1: Description (Tech)"],
       "after": ["Project 1: Improved Description (Tech)"],
       "beforeJson": [{ "title": "Project 1", "description": "Description", "tech": "Tech" }],
       "afterJson": [{ "title": "Project 1", "description": "Improved Description", "tech": "Tech" }]
     }
   }

4. OBJECT WITH CATEGORIES (skills):
   - "beforeJson": { "Languages": [...], "Frameworks": [...] }
   - "afterJson": { "Languages": [...], "Frameworks": [...] }
   Example:
   {
     "skills": {
       "before": ["Languages: Python, JavaScript", "Frameworks: Django"],
       "after": ["Languages: Python, JavaScript, TypeScript", "Frameworks: Django, React"],
       "beforeJson": { "Languages": ["Python", "JavaScript"], "Frameworks": ["Django"] },
       "afterJson": { "Languages": ["Python", "JavaScript", "TypeScript"], "Frameworks": ["Django", "React"] }
     }
   }

CRITICAL:
- ALWAYS include both "beforeJson" and "afterJson" for EVERY section
- "beforeJson" must match the EXACT current structure from the resume JSON
- "afterJson" must be the EXACT new structure you want to apply
- For simple strings: use string values, not arrays or objects
- For arrays: use array values
- For objects: use object values
- keywords array should always be empty []
`;

    const userPrompt = `
USER EDIT REQUEST:
${prompt}

CURRENT RESUME JSON:
${JSON.stringify(resumeJson, null, 2)}

Return JSON only, following the exact format specified.
`;

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...history,
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ]
    });

    let text = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    console.log(parsed);

    if (!parsed.messageinfo || !Array.isArray(parsed.keys) || !parsed.edits) {
      throw new Error("Invalid AI response structure");
    }

    const messageObject = {
      messageinfo: parsed.messageinfo,
      keys: parsed.keys,
      keywords: [],
      edits: {}
    };

    for (const key of parsed.keys) {
      if (!parsed.edits[key]) continue;
      
      const edit = parsed.edits[key];
      
      if (!Array.isArray(edit.before) || !Array.isArray(edit.after)) {
        throw new Error(`Invalid edit structure for section '${key}': before and after must be arrays`);
      }
      
      if (edit.beforeJson === undefined || edit.afterJson === undefined) {
        throw new Error(`Invalid edit structure for section '${key}': missing beforeJson or afterJson`);
      }
      
      messageObject.edits[key] = {
        before: edit.before,
        after: edit.after,
        beforeJson: edit.beforeJson,
        afterJson: edit.afterJson
      };
    }

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
      message: messageObject,
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