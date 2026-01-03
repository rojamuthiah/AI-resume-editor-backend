const { GoogleGenerativeAI } = require("@google/generative-ai");

/* ================= GEMINI SETUP ================= */

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash"
});

/* ================= JSON HELPERS ================= */

function stripMarkdown(text) {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function extractJSONObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in AI response");
  }

  return text.slice(start, end + 1);
}

function safeParseJSON(text) {
  const cleaned = stripMarkdown(text);
  const jsonText = extractJSONObject(cleaned);
  return JSON.parse(jsonText);
}

/* ================= MAIN FUNCTION ================= */

async function generateResumeFromDocument({
  defaultJson,
  documentText
}) {
  if (!defaultJson || !documentText) {
    throw new Error("defaultJson and documentText are required");
  }

  const systemPrompt = `
You are a resume parsing engine.

STRICT RULES (NO EXCEPTIONS):
- You MUST return ONLY valid JSON
- DO NOT wrap output in markdown
- DO NOT add explanations
- DO NOT add comments
- Output MUST start with { and end with }
- Preserve JSON structure EXACTLY
- Do NOT add or remove keys
- Populate fields ONLY if information exists
- Missing data → keep default values
`;

  const userPrompt = `
DEFAULT_RESUME_JSON:
${JSON.stringify(defaultJson, null, 2)}

RESUME_TEXT:
"""
${documentText}
"""
`;

  /* ============ FIRST ATTEMPT ============ */
  const result = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "user", parts: [{ text: userPrompt }] }
    ]
  });

  const rawText = result.response.text();

  try {
    return safeParseJSON(rawText);
  } catch (err) {
    console.warn("Gemini returned invalid JSON, retrying once...");
  }

  /* ============ RETRY (FIX MODE) ============ */
  const retryPrompt = `
The previous response was INVALID JSON.

Fix it now.

RULES:
- Return ONLY valid JSON
- No markdown
- No explanations
- Start with { and end with }

INVALID RESPONSE:
${rawText}
`;

  const retryResult = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: retryPrompt }] }
    ]
  });

  const retryText = retryResult.response.text();

  try {
    return safeParseJSON(retryText);
  } catch (err) {
    console.error("Gemini retry failed:", retryText);
    throw new Error("Failed to generate valid resume JSON from AI");
  }
}

module.exports = {
  generateResumeFromDocument
};
