const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

/**
 * Extract plain text from supported resume documents
 */
async function extractTextFromDocument(file) {
  if (!file || !file.buffer || !file.mimetype) {
    throw new Error("Invalid file provided");
  }

  switch (file.mimetype) {
    case "application/pdf": {
      const data = await pdfParse(file.buffer);
      return cleanText(data.text);
    }

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const result = await mammoth.extractRawText({
        buffer: file.buffer
      });
      return cleanText(result.value);
    }

    default:
      throw new Error(
        "Unsupported file type. Only PDF and DOCX are allowed."
      );
  }
}

function cleanText(text) {
  if (!text) return "";

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

module.exports = {
  extractTextFromDocument
};
