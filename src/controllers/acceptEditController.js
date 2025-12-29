const UserResume = require("../models/UserResume");

// Helper to compare sections (handles arrays and objects)
const sectionsMatch = (current, before) => {
  if (Array.isArray(current) && Array.isArray(before)) {
    return JSON.stringify(current) === JSON.stringify(before);
  }
  if (typeof current === 'object' && typeof before === 'object') {
    return JSON.stringify(current) === JSON.stringify(before);
  }
  return current === before;
};

exports.acceptEdit = async (req, res) => {
  try {
    const {
      templateKey,
      category,
      section,
      sectionData,
      beforeData
    } = req.body;

    const userId = req.user.id;

    if (!templateKey || !category || !section || sectionData === undefined || beforeData === undefined) {
      return res.status(400).json({
        success: false,
        error: "templateKey, category, section, sectionData, and beforeData are required"
      });
    }

    /** 1️⃣ Load resume */
    const resume = await UserResume.findOne({ userId, templateKey });

    if (!resume) {
      return res.status(404).json({ 
        success: false,
        error: "Resume not found" 
      });
    }

    /** 2️⃣ Allow new sections to be added */
    if (!(section in resume.resumeJson)) {
      resume.resumeJson[section] = beforeData;
    }

    /** 3️⃣ Validate "before" matches current (stale edit check) */
    const currentSection = resume.resumeJson[section];
    if (!sectionsMatch(currentSection, beforeData)) {
      return res.json({
        success: false,
        message: "This edit is based on an older version of your resume. The section has changed since this edit was suggested.",
        error: "incompatible_version"
      });
    }

    /** 4️⃣ Update ONLY the accepted section */
    const updatedResumeJson = {
      ...resume.resumeJson,
      [section]: sectionData
    };

    /** 5️⃣ Persist update */
    resume.resumeJson = updatedResumeJson;
    resume.category = category;
    resume.lastUpdated = new Date();
    await resume.save();

    return res.json({
      success: true,
      updatedSection: section,
      resumeJson: updatedResumeJson
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

exports.revertEdit = async (req, res) => {
  try {
    const {
      templateKey,
      category,
      section,
      beforeData
    } = req.body;

    const userId = req.user.id;

    if (!templateKey || !category || !section || beforeData === undefined) {
      return res.status(400).json({
        success: false,
        error: "templateKey, category, section, and beforeData are required"
      });
    }

    /** 1️⃣ Load resume */
    const resume = await UserResume.findOne({ userId, templateKey });

    if (!resume) {
      return res.status(404).json({ 
        success: false,
        error: "Resume not found" 
      });
    }

    /** 2️⃣ Validate section exists */
    if (!(section in resume.resumeJson)) {
      return res.status(400).json({
        success: false,
        error: `Invalid section '${section}'`
      });
    }

    /** 3️⃣ Revert to "before" state */
    const updatedResumeJson = {
      ...resume.resumeJson,
      [section]: beforeData
    };

    /** 4️⃣ Persist update */
    resume.resumeJson = updatedResumeJson;
    resume.category = category;
    resume.lastUpdated = new Date();
    await resume.save();

    return res.json({
      success: true,
      revertedSection: section,
      resumeJson: updatedResumeJson
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