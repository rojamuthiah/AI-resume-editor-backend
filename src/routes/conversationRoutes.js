const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/authMiddleware");

const {
  listConversations,
  getLatestConversation,
  getConversationById,
} = require("../controllers/conversationController");

/**
 * Conversation routes (ONLY chat history)
 * Mounted at: /api/resume
 */

router.get(
  "/:templateKey/conversations",
  requireAuth,
  listConversations
);

router.get(
  "/:templateKey/conversations/latest",
  requireAuth,
  getLatestConversation
);

router.get(
  "/:templateKey/conversations/:conversationId",
  requireAuth,
  getConversationById
);

module.exports = router;
