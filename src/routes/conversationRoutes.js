const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  listConversations,
  getLatestConversation,
  getConversationById,
} = require("../controllers/conversationController");

const router = express.Router();

router.use(authMiddleware);

/**
 * Resume-scoped conversations
 */
router.get("/:resumeId/conversations", listConversations);
router.get("/:resumeId/conversations/latest", getLatestConversation);
router.get("/:resumeId/conversations/:conversationId", getConversationById);

module.exports = router;
