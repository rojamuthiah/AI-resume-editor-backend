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
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    let resume = await UserResume.findOne({ userId, templateKey });

    if (!resume) {
      const templatePath = path.join(
        __dirname,
        "..",
        "..",
        "templates",
        category,
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
        category,
        resumeJson: defaultJson
      });
    }

    return res.json({
      success: true,
      resumeJson: resume.resumeJson,
      category: resume.category
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateKey, resumeJson, category } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    const updated = await UserResume.findOneAndUpdate(
      { userId, templateKey },
      { resumeJson, category, lastUpdated: new Date() },
      { new: true, upsert: true }
    );

    return res.json({ success: true, resume: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.renderResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateKey, category, previewMode = false, previewData = null } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    // Load template from category/templateKey structure
    const templatePath = path.join(
      __dirname,
      "..",
      "..",
      "templates",
      category,
      templateKey,
      "template.html"
    );

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    const template = fs.readFileSync(templatePath, "utf8");

    let resumeJsonData;
    let originalData = null;

    // 🔑 PREVIEW MODE: Show diff between original and preview
    if (previewMode && previewData) {
      const resume = await UserResume.findOne({ userId, templateKey });
      if (!resume) {
        return res.status(404).json({ success: false, message: "Resume not found" });
      }

      originalData = resume.resumeJson;
      
      // Merge preview data
      resumeJsonData = {
        ...resume.resumeJson,
        ...previewData
      };
    } 
    // 🔑 NORMAL MODE: Use DB as source of truth
    else {
      const resume = await UserResume.findOne({ userId, templateKey });
      if (!resume) {
        return res.status(404).json({ success: false, message: "Resume not found" });
      }
      resumeJsonData = resume.resumeJson;
    }

    // 🔑 Add diff markers for arrays (experience, projects, etc.)
    if (previewMode && originalData && previewData) {
      Object.keys(previewData).forEach(sectionKey => {
        if (Array.isArray(previewData[sectionKey]) && Array.isArray(originalData[sectionKey])) {
          const original = originalData[sectionKey];
          const updated = previewData[sectionKey];

          // Mark items: added (new), removed (old), or unchanged
          resumeJsonData[sectionKey] = updated.map((item, idx) => {
            const originalItem = original[idx];
            
            // Check if item changed
            if (!originalItem) {
              return { ...item, _diffStatus: 'added' };
            }
            
            const itemChanged = JSON.stringify(item) !== JSON.stringify(originalItem);
            if (itemChanged) {
              return { ...item, _diffStatus: 'modified', _original: originalItem };
            }
            
            return { ...item, _diffStatus: 'unchanged' };
          });

          // Add removed items at the end
          if (original.length > updated.length) {
            for (let i = updated.length; i < original.length; i++) {
              resumeJsonData[sectionKey].push({
                ...original[i],
                _diffStatus: 'removed'
              });
            }
          }
        }
      });
    }

    // 🔑 PREPARE DATA FOR MUSTACHE
    const resumeData = {
      ...resumeJsonData,
      
      hasSummary: !!resumeJsonData.summary,
      hasEducation: Array.isArray(resumeJsonData.education) && resumeJsonData.education.length > 0,
      hasSkills: resumeJsonData.skills && Object.keys(resumeJsonData.skills).length > 0,
      hasExperience: Array.isArray(resumeJsonData.experience) && resumeJsonData.experience.length > 0,
      hasProjects: Array.isArray(resumeJsonData.projects) && resumeJsonData.projects.length > 0,
      hasPublications: Array.isArray(resumeJsonData.publications) && resumeJsonData.publications.length > 0,
      hasAwards: Array.isArray(resumeJsonData.awards) && resumeJsonData.awards.length > 0,
      hasVolunteer: Array.isArray(resumeJsonData.volunteer) && resumeJsonData.volunteer.length > 0,
      
      skillsArray: Object.entries(resumeJsonData.skills || {}).map(
        ([category, values]) => ({
          category,
          values: Array.isArray(values) ? values.join(", ") : String(values)
        })
      ),

      isPreview: previewMode
    };

    // Render HTML
    const html = Mustache.render(template, resumeData);

    // Generate PDF
    const pdfBuffer = await generatePDF(html);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=" + (previewMode ? "preview.pdf" : "resume.pdf"));
    res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};