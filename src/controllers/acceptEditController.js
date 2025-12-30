const mongoose = require("mongoose");
const UserResume = require("../models/UserResume");

// ─────────────────────────────────────────────
// Helper: compare sections safely
// ─────────────────────────────────────────────
const sectionsMatch = (current, before) => {
  if (Array.isArray(current) && Array.isArray(before)) {
    return JSON.stringify(current) === JSON.stringify(before);
  }

  if (
    typeof current === "object" &&
    current !== null &&
    typeof before === "object" &&
    before !== null
  ) {
    return JSON.stringify(current) === JSON.stringify(before);
  }

  return current === before;
};

// ─────────────────────────────────────────────
// ACCEPT EDIT
// ─────────────────────────────────────────────
exports.acceptEdit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId, section, sectionData, beforeData } = req.body;

    // Validation
    if (!resumeId || !section || sectionData === undefined || beforeData === undefined) {
      return res.status(400).json({
        success: false,
        error: "resumeId, section, sectionData, and beforeData are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid resumeId"
      });
    }

    // Fetch resume (ONLY UserResume)
    const resume = await UserResume.findOne({
      _id: resumeId,
      userId
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: "Resume not found"
      });
    }

    // Allow new sections to be added
    if (!(section in resume.resumeJson)) {
      resume.resumeJson[section] = beforeData;
    }

    // Stale edit protection
    const currentSection = resume.resumeJson[section];
    if (!sectionsMatch(currentSection, beforeData)) {
      return res.json({
        success: false,
        error: "incompatible_version",
        message:
          "This edit is based on an older version of your resume. The section has changed since this edit was suggested."
      });
    }

    // Apply section update
    resume.resumeJson = {
      ...resume.resumeJson,
      [section]: sectionData
    };

    resume.lastUpdated = new Date();
    await resume.save();

    return res.json({
      success: true,
      updatedSection: section,
      resumeJson: resume.resumeJson
    });

  } catch (err) {
    console.error("Accept Edit Error:", err);
    return res.status(500).json({
      success: false,
      error: "Accept edit failed",
      details: err.message
    });
  }
};

// ─────────────────────────────────────────────
// REVERT EDIT
// ─────────────────────────────────────────────
exports.revertEdit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId, section, beforeData } = req.body;

    // Validation
    if (!resumeId || !section || beforeData === undefined) {
      return res.status(400).json({
        success: false,
        error: "resumeId, section, and beforeData are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid resumeId"
      });
    }

    // Fetch resume
    const resume = await UserResume.findOne({
      _id: resumeId,
      userId
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: "Resume not found"
      });
    }

    if (!(section in resume.resumeJson)) {
      return res.status(400).json({
        success: false,
        error: `Invalid section '${section}'`
      });
    }

    // Revert section
    resume.resumeJson = {
      ...resume.resumeJson,
      [section]: beforeData
    };

    resume.lastUpdated = new Date();
    await resume.save();

    return res.json({
      success: true,
      revertedSection: section,
      resumeJson: resume.resumeJson
    });

  } catch (err) {
    console.error("Revert Edit Error:", err);
    return res.status(500).json({
      success: false,
      error: "Revert edit failed",
      details: err.message
    });
  }
};
