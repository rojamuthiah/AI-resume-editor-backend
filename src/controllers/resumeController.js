const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Mustache = require("mustache");

const UserResume = require("../models/UserResume");
const generatePDF = require("../utils/pdfGenerator");

/**
 * CREATE RESUME
 * - Creates a resume from template.json
 * - Returns resumeId
 */
exports.createResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateKey, category, name, description } = req.body;

    if (!templateKey || !category || !name) {
      return res.status(400).json({
        success: false,
        message: "templateKey, category, and name are required"
      });
    }

    const templateJsonPath = path.join(
      __dirname,
      "..",
      "..",
      "templates",
      category,
      templateKey,
      "template.json"
    );

    if (!fs.existsSync(templateJsonPath)) {
      return res.status(404).json({
        success: false,
        message: "Template JSON not found"
      });
    }

    const defaultJson = JSON.parse(
      fs.readFileSync(templateJsonPath, "utf-8")
    );

    const resume = await UserResume.create({
      userId,
      templateKey,
      category,
      name,
      description: description || "",
      resumeJson: defaultJson
    });

    return res.status(201).json({
      success: true,
      resumeId: resume._id
    });

  } catch (err) {
    console.error("Create Resume Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/**
 * GET ALL RESUMES
 * - By userId + templateKey + category
 */
exports.getAllResumes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateKey, category } = req.query;

    if (!templateKey || !category) {
      return res.status(400).json({
        success: false,
        message: "templateKey and category are required"
      });
    }

    const resumes = await UserResume.find({
      userId,
      templateKey,
      category
    })
      .select("_id name description lastUpdated")
      .sort({ lastUpdated: -1 });


    return res.json({
      success: true,
      resumes
    });

  } catch (err) {
    console.error("Get All Resumes Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * GET RESUME BY ID
 */
exports.getResumeById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resumeId"
      });
    }

    const resume = await UserResume.findOne({
      _id: resumeId,
      userId
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found"
      });
    }

    return res.json({
      success: true,
      resumeId: resume._id,
      templateKey: resume.templateKey,
      category: resume.category,
      resumeJson: resume.resumeJson,
      lastUpdated: resume.lastUpdated
    });

  } catch (err) {
    console.error("Get Resume Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * RENDER RESUME (PDF)
 * - Always by resumeId
 */
exports.renderResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId, previewMode = false, previewData = null } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        message: "resumeId is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resumeId"
      });
    }

    const resume = await UserResume.findOne({
      _id: resumeId,
      userId
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found"
      });
    }

    const templatePath = path.join(
      __dirname,
      "..",
      "..",
      "templates",
      resume.category,
      resume.templateKey,
      "template.html"
    );

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        success: false,
        message: "Template HTML not found"
      });
    }

    const template = fs.readFileSync(templatePath, "utf-8");

    let resumeJsonData = resume.resumeJson;

    if (previewMode && previewData) {
      resumeJsonData = {
        ...resume.resumeJson,
        ...previewData
      };
    }

    const resumeData = {
      ...resumeJsonData,

      hasSummary: !!resumeJsonData.summary,

      hasEducation:
        Array.isArray(resumeJsonData.education) &&
        resumeJsonData.education.length > 0,

      hasExperience:
        Array.isArray(resumeJsonData.experience) &&
        resumeJsonData.experience.length > 0,

      hasProjects:
        Array.isArray(resumeJsonData.projects) &&
        resumeJsonData.projects.length > 0,

      hasPublications:
        Array.isArray(resumeJsonData.publications) &&
        resumeJsonData.publications.length > 0,

      hasAwards:
        Array.isArray(resumeJsonData.awards) &&
        resumeJsonData.awards.length > 0,

      hasVolunteer:
        Array.isArray(resumeJsonData.volunteer) &&
        resumeJsonData.volunteer.length > 0,

      hasSkills:
        resumeJsonData.skills &&
        Object.keys(resumeJsonData.skills).length > 0,

      skillsArray: Object.entries(resumeJsonData.skills || {}).map(
        ([category, values]) => ({
          category,
          values: Array.isArray(values) ? values.join(", ") : String(values),
        })
      ),

      isPreview: previewMode,
    };


    const html = Mustache.render(template, resumeData);
    const pdfBuffer = await generatePDF(html);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${previewMode ? "preview.pdf" : "resume.pdf"}`
    );

    res.send(pdfBuffer);

  } catch (err) {
    console.error("Render Resume Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};



/**
 * DELETE RESUME
 * - Deletes a resume by ID (owner only)
 */
exports.deleteResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resumeId"
      });
    }

    const deleted = await UserResume.findOneAndDelete({
      _id: resumeId,
      userId
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Resume not found"
      });
    }

    return res.json({
      success: true,
      message: "Resume deleted"
    });

  } catch (err) {
    console.error("Delete Resume Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/**
 * RENAME RESUME
 * - Updates name & description
 */
exports.renameResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resumeId"
      });
    }

    const resume = await UserResume.findOneAndUpdate(
      { _id: resumeId, userId },
      {
        name,
        description: description || "",
        lastUpdated: new Date()
      },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found"
      });
    }

    return res.json({
      success: true,
      resume
    });

  } catch (err) {
    console.error("Rename Resume Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
