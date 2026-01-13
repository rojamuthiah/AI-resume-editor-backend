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

    // 🔹 Transform messages
    const transformedMessages = convo.messages.map(msg => {
      if (msg.role === "assistant" && msg.type === "analyse") {
        let score = null;

        try {
          const parsed = JSON.parse(msg.content);
          score = parsed?.relevanceScore ?? "N/A";
        } catch (e) {
          score = "N/A";
        }

        return {
          ...msg.toObject(),
          content: `Analysis completed – score: ${score}. Please view full analysis in the analysis panel.`
        };
      }

      return msg;
    });

    return res.json({
      success: true,
      conversation: {
        conversationId: convo.conversationId,
        title: convo.title,
        messages: transformedMessages
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

    // 🔹 Validate resumeId
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resumeId"
      });
    }

    // 🔹 Fetch conversation
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

    // 🔹 Transform messages (assistant + analyse only)
    const transformedMessages = convo.messages.map(msg => {
      if (msg.role === "assistant" && msg.type === "analyse") {
        let score = "N/A";

        try {
          const parsed = JSON.parse(msg.content);
          score = parsed?.relevanceScore ?? "N/A";
        } catch (err) {
          // silently fail
        }

        return {
          ...msg.toObject(),
          content: `Analysis completed – score: ${score}. Please view full analysis in the analysis panel.`
        };
      }

      return msg;
    });

    return res.json({
      success: true,
      conversation: {
        conversationId: convo.conversationId,
        title: convo.title,
        messages: transformedMessages
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