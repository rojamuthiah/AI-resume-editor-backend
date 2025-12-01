// controllers/resumeController.js
const fs = require("fs");
const path = require("path");
const UserResume = require("../models/UserResume");
const ResumeConversation = require("../models/resumeConversation");
const renderHTML = require("../utils/htmlRenderer");
const generatePDF = require("../utils/pdfGenerator");
const {
  listConversations,
  getConversation,
} = require("../utils/conversationHelper");

exports.getResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateKey } = req.params;

    let resume = await UserResume.findOne({ userId, templateKey });

    if (!resume) {
      const templatePath = path.join(
        __dirname,
        "..",
        "..",
        "templates",
        templateKey,
        "template.json"
      );

      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ success: false, message: "Template not found" });
      }

      const defaultJson = JSON.parse(fs.readFileSync(templatePath, "utf-8"));

      resume = await UserResume.create({
        userId,
        templateKey,
        resumeJson: defaultJson
      });
    }

    return res.json({
      success: true,
      resumeJson: resume.resumeJson
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateKey, resumeJson } = req.body;

    const updated = await UserResume.findOneAndUpdate(
      { userId, templateKey },
      { resumeJson, lastUpdated: new Date() },
      { new: true }
    );

    return res.json({ success: true, resume: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.renderResume = async (req, res) => {
  try {
    const { templateKey, resumeJson } = req.body;

    const html = renderHTML(templateKey, resumeJson);
    const pdfBuffer = await generatePDF(html);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=resume.pdf");
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.toString() });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateKey, conversationId } = req.params;

    const convo = await getConversation(userId, templateKey, conversationId);

    return res.json({
      success: true,
      conversationId,
      title: convo?.title,
      messages: convo?.messages || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateKey } = req.params;

    const convos = await listConversations(userId, templateKey);

    return res.json({
      success: true,
      conversations: convos.map((c) => ({
        id: c.conversationId,
        title: c.title,
        updatedAt: c.updatedAt,
        messageCount: c.messages.length || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
