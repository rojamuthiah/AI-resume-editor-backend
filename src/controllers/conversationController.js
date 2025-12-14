const mongoose = require("mongoose");
const ResumeConversation = require("../models/resumeConversation");

/**
 * GET conversation titles (dropdown)
 * userId + templateKey
 */
exports.listConversations = async (req, res) => {
  try {
    const { templateKey } = req.params;

   
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const conversations = await ResumeConversation.find(
      { userId, templateKey },
      { conversationId: 1, title: 1, updatedAt: 1, _id: 0 }
    ).sort({ updatedAt: -1 });

    return res.json({
      success: true,
      conversations: conversations.map((c) => ({
        id: c.conversationId,
        title: c.title,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (err) {
    console.error("listConversations:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET latest conversation (auto-open)
 */
exports.getLatestConversation = async (req, res) => {
  try {
    const { templateKey } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const convo = await ResumeConversation.findOne({
      userId,
      templateKey,
    }).sort({ updatedAt: -1 });

    if (!convo) {
      return res.json({ success: true, conversation: null });
    }

    return res.json({
      success: true,
      conversation: {
        conversationId: convo.conversationId,
        title: convo.title,
        messages: convo.messages,
      },
    });
  } catch (err) {
    console.error("getLatestConversation:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET full conversation
 * userId + templateKey + conversationId
 */
exports.getConversationById = async (req, res) => {
  try {
    const { templateKey, conversationId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const convo = await ResumeConversation.findOne({
      userId,
      templateKey,
      conversationId,
    });

    if (!convo) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.json({
      success: true,
      conversation: {
        conversationId: convo.conversationId,
        title: convo.title,
        messages: convo.messages,
      },
    });
  } catch (err) {
    console.error("getConversationById:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
