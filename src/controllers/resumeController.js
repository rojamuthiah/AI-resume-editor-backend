// controllers/resumeController.js
const fs = require("fs");
const path = require("path");
const UserResume = require("../models/UserResume");
const Mustache = require("mustache");
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
    const userId = req.user.id;
    const { templateKey } = req.body; // Only need templateKey

    // Load template
    const templatePath = path.join(
      __dirname,
      "..",
      "..",
      "templates",
      templateKey,
      "template.html"
    );

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    const template = fs.readFileSync(templatePath, "utf8");

    // Fetch resume JSON from DB (source of truth)
    const resume = await UserResume.findOne({ userId, templateKey });
    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    // 🔑 PREPARE DATA FOR MUSTACHE with all helper flags
    const resumeData = {
      ...resume.resumeJson,
      
      // Helper flags for conditional sections (REQUIRED for template)
      hasSummary: !!resume.resumeJson.summary,
      hasEducation: Array.isArray(resume.resumeJson.education) && resume.resumeJson.education.length > 0,
      hasSkills: resume.resumeJson.skills && Object.keys(resume.resumeJson.skills).length > 0,
      hasExperience: Array.isArray(resume.resumeJson.experience) && resume.resumeJson.experience.length > 0,
      hasProjects: Array.isArray(resume.resumeJson.projects) && resume.resumeJson.projects.length > 0,
      hasPublications: Array.isArray(resume.resumeJson.publications) && resume.resumeJson.publications.length > 0,
      hasAwards: Array.isArray(resume.resumeJson.awards) && resume.resumeJson.awards.length > 0,
      hasVolunteer: Array.isArray(resume.resumeJson.volunteer) && resume.resumeJson.volunteer.length > 0,
      
      // Skills array for Mustache loop
      skillsArray: Object.entries(resume.resumeJson.skills || {}).map(
        ([category, values]) => ({
          category,
          values: Array.isArray(values) ? values.join(", ") : String(values)
        })
      )
    };

    // Render HTML
    const html = Mustache.render(template, resumeData);

    // Generate PDF
    const pdfBuffer = await generatePDF(html);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=resume.pdf");
    res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};