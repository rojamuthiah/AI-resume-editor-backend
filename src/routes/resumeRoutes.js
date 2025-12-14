const express = require("express");
const router = express.Router();
const {
  getResume,
  saveResume,
  renderResume,
  getConversation,
  listConversations,
  getLatestConversation,
  getConversationById
} = require("../controllers/resumeController");
const requireAuth = require("../middlewares/authMiddleware");

router.get("/:templateKey", requireAuth, getResume);
router.post("/save", requireAuth, saveResume);
router.post("/render", requireAuth, renderResume);


module.exports = router;
