const express = require("express");
const router = express.Router();
const {
  getResume,
  saveResume,
  renderResume,
  getConversation,
  listConversations,
} = require("../controllers/resumeController");
const requireAuth = require("../middlewares/authMiddleware");

router.get("/:templateKey", requireAuth, getResume);
router.get("/:templateKey/conversations", requireAuth, listConversations);
router.get("/:templateKey/conversations/:conversationId", requireAuth, getConversation);
router.post("/save", requireAuth, saveResume);
router.post("/render", requireAuth, renderResume);

module.exports = router;
