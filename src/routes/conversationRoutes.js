const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  listConversations,
  getLatestConversation,
  getConversationById,
} = require("../controllers/conversationController");

const router = express.Router();

router.use(authMiddleware);

router.get("/:templateKey/:category/conversations", listConversations);
router.get("/:templateKey/:category/conversations/latest", getLatestConversation);
router.get("/:templateKey/:category/conversations/:conversationId", getConversationById);

module.exports = router;