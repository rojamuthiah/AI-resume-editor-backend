const mongoose = require("mongoose");
const UserResume = require("../models/UserResume");
const path = require("path");
const fs = require("fs");
const Mustache = require("mustache");
const generatePDF = require("../utils/pdfGenerator");
const crypto = require("crypto");
const NodeCache = require("node-cache");

// ─────────────────────────────────────────────
// PDF CACHE SETUP
// ─────────────────────────────────────────────
const pdfCache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired entries every 60 seconds
  useClones: false // Don't clone buffers for performance
});

// Track cache statistics
let cacheStats = { hits: 0, misses: 0 };

// ─────────────────────────────────────────────
// Helper: Generate cache key from resume data
// ─────────────────────────────────────────────
const generateCacheKey = (resumeId, resumeJsonData, previewMode, templateKey) => {
  const dataString = JSON.stringify({
    resumeId,
    data: resumeJsonData,
    preview: previewMode,
    template: templateKey
  });

  return crypto
    .createHash("md5")
    .update(dataString)
    .digest("hex");
};

// ─────────────────────────────────────────────
// Helper: Clear cache for specific resume
// ─────────────────────────────────────────────
const clearResumeCache = (resumeId) => {
  const keys = pdfCache.keys();
  let clearedCount = 0;

  keys.forEach(key => {
    // Check if cache key contains this resumeId
    if (key.includes(resumeId)) {
      pdfCache.del(key);
      clearedCount++;
    }
  });

  if (clearedCount > 0) {
    console.log(`[Cache] Cleared ${clearedCount} cache entries for resume ${resumeId}`);
  }
};

// Export for use in other controllers
exports.clearResumeCache = clearResumeCache;

// ─────────────────────────────────────────────
// RENDER RESUME (With Caching & Browser Pooling)
// ─────────────────────────────────────────────
exports.renderResume = async (req, res) => {
  const startTime = Date.now();

  try {
    const userId = req.user.id;
    const { resumeId, previewMode = false, previewData = null } = req.body;

    // Validation
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

    // Fetch resume
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

    // Prepare resume data
    let resumeJsonData = resume.resumeJson;

    if (previewMode && previewData) {
      resumeJsonData = {
        ...resume.resumeJson,
        ...previewData
      };
    }

    // ─────────────────────────────────────────────
    //  CACHE CHECK - Generate unique cache key
    // ─────────────────────────────────────────────
    const cacheKey = generateCacheKey(
      resumeId,
      resumeJsonData,
      previewMode,
      resume.templateKey
    );

    // Check if PDF exists in cache
    const cachedPdf = pdfCache.get(cacheKey);
    if (cachedPdf) {
      cacheStats.hits++;
      const duration = Date.now() - startTime;
      
      console.log(
        `[PDF Cache HIT] ${cacheKey.substring(0, 8)}... ` +
        `(${duration}ms) ` +
        `Hit Rate: ${((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)}%`
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename=${previewMode ? "preview.pdf" : "resume.pdf"}`
      );
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-Time", `${duration}ms`);

      return res.send(cachedPdf);
    }

    // ─────────────────────────────────────────────
    //  CACHE MISS - Generate PDF
    // ─────────────────────────────────────────────
    cacheStats.misses++;
    console.log(
      `[PDF Cache MISS] ${cacheKey.substring(0, 8)}... ` +
      `Hit Rate: ${((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)}%`
    );

    // Load template
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

    // Prepare resume data for template
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

    // Render HTML
    const html = Mustache.render(template, resumeData);

    // Generate PDF with browser pooling
    const pdfBuffer = await generatePDF(html);

    // ─────────────────────────────────────────────
    // STORE IN CACHE
    // ─────────────────────────────────────────────
    // Cache for 5 minutes (preview) or 10 minutes (final)
    const cacheTTL = previewMode ? 300 : 600;
    pdfCache.set(cacheKey, pdfBuffer, cacheTTL);

    const duration = Date.now() - startTime;
    console.log(
      `[PDF Generated] ${cacheKey.substring(0, 8)}... ` +
      `(${duration}ms) ` +
      `Size: ${(pdfBuffer.length / 1024).toFixed(1)}KB ` +
      `TTL: ${cacheTTL}s`
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${previewMode ? "preview.pdf" : "resume.pdf"}`
    );
    res.setHeader("X-Cache", "MISS");
    res.setHeader("X-Generation-Time", `${duration}ms`);

    res.send(pdfBuffer);

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Render Resume Error] (${duration}ms)`, err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ─────────────────────────────────────────────
// GET CACHE STATS (Optional - for monitoring)
// ─────────────────────────────────────────────
exports.getCacheStats = (req, res) => {
  const stats = pdfCache.getStats();
  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100
    : 0;

  res.json({
    cacheStats: {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: `${hitRate.toFixed(2)}%`
    },
    nodeCache: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize
    }
  });
};

// ─────────────────────────────────────────────
// CLEAR CACHE ENDPOINT (Optional - for manual clearing)
// ─────────────────────────────────────────────
exports.clearCache = (req, res) => {
  const { resumeId } = req.body;

  if (resumeId) {
    clearResumeCache(resumeId);
    res.json({
      success: true,
      message: `Cache cleared for resume ${resumeId}`
    });
  } else {
    const keyCount = pdfCache.keys().length;
    pdfCache.flushAll();
    cacheStats = { hits: 0, misses: 0 };
    res.json({
      success: true,
      message: `All cache cleared (${keyCount} entries)`
    });
  }
};

module.exports = exports;