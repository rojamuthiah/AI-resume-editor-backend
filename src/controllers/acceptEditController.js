const UserResume = require("../models/UserResume");

exports.acceptEdit = async (req, res) => {
  try {
    const {
      templateKey,
      section,
      sectionData
    } = req.body;

    const userId = req.user.id;

    if (!templateKey || !section || sectionData === undefined) {
      return res.status(400).json({
        error: "templateKey, section, and sectionData are required"
      });
    }

    /** 1️⃣ Load resume */
    const resume = await UserResume.findOne({ userId, templateKey });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    /** 2️⃣ Validate section exists in resume schema */
    if (!(section in resume.resumeJson)) {
      return res.status(400).json({
        error: `Invalid section '${section}'`
      });
    }

    /** 3️⃣ Update ONLY the accepted section */
    const updatedResumeJson = {
      ...resume.resumeJson,
      [section]: sectionData
    };

    /** 4️⃣ Persist update */
    resume.resumeJson = updatedResumeJson;
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
      error: "Accept edit failed",
      details: err.message
    });
  }
};
