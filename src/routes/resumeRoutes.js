const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  createResume,
  getAllResumes,
  getResumeById,
  renderResume,
  renameResume,
  deleteResume,
  renderResumeHtml,
  downloadResumePdf
} = require("../controllers/resumeController");

const router = express.Router();

router.use(authMiddleware);

/**
 * Create a new resume
 * POST /resume
 */
router.post("/", createResume);

/**
 * List all resumes for user (filtered by templateKey + category via query)
 * GET /resume?templateKey=...&category=...
 */
router.get("/", getAllResumes);

/**
 * Get a resume by resumeId
 * GET /resume/:resumeId
 */
router.get("/:resumeId", getResumeById);

/**
 * Render resume PDF
 * POST /resume/render
 */
router.post("/render", renderResume);

router.patch("/:resumeId", renameResume);
router.delete("/:resumeId", deleteResume);
router.post("/render-html", renderResumeHtml);
router.get("/:resumeId/download", downloadResumePdf);



module.exports = router;
