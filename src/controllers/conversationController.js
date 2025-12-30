const mongoose = require("mongoose");
const ResumeConversation = require("../models/resumeConversation");

/**
 * LIST CONVERSATIONS (for dropdown)
 * userId + resumeId
 */
exports.listConversations = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resumeId"
      });
    }

    const conversations = await ResumeConversation.find(
      {
        userId,
        resumeId
      },
      {
        conversationId: 1,
        title: 1,
        updatedAt: 1,
        _id: 0
      }
    ).sort({ updatedAt: -1 });

    return res.json({
      success: true,
      conversations: conversations.map(c => ({
        id: c.conversationId,
        title: c.title,
        updatedAt: c.updatedAt
      }))
    });

  } catch (err) {
    console.error("listConversations:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * GET LATEST CONVERSATION (auto-open)
 * userId + resumeId
 */
exports.getLatestConversation = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resumeId"
      });
    }

    const convo = await ResumeConversation.findOne({
      userId,
      resumeId
    }).sort({ updatedAt: -1 });

    if (!convo) {
      return res.json({
        success: true,
        conversation: null
      });
    }

    return res.json({
      success: true,
      conversation: {
        conversationId: convo.conversationId,
        title: convo.title,
        messages: convo.messages
      }
    });

  } catch (err) {
    console.error("getLatestConversation:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * GET FULL CONVERSATION BY ID
 * userId + resumeId + conversationId
 */
exports.getConversationById = async (req, res) => {
  try {
    const { resumeId, conversationId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resumeId"
      });
    }

    const convo = await ResumeConversation.findOne({
      userId,
      resumeId,
      conversationId
    });

    if (!convo) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    return res.json({
      success: true,
      conversation: {
        conversationId: convo.conversationId,
        title: convo.title,
        messages: convo.messages
      }
    });

  } catch (err) {
    console.error("getConversationById:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
