const ResumeConversation = require("../models/resumeConversation");
const { v4: uuidv4 } = require("uuid");

/**
 * Create a brand new conversation for a resume
 */
const createConversation = async (userId, resumeId, title) => {
  const conversationId = uuidv4();

  const convo = new ResumeConversation({
    userId,
    resumeId,
    conversationId,
    title: title || "New conversation",
    messages: []
  });

  await convo.save();
  return convo;
};

/**
 * Fetch a single conversation by resume
 */
const getConversation = async (userId, resumeId, conversationId) => {
  return await ResumeConversation.findOne({
    userId,
    resumeId,
    conversationId
  });
};

/**
 * List all conversations for a resume (dropdown)
 */
const listConversations = async (userId, resumeId) => {
  const conversations = await ResumeConversation.find({
    userId,
    resumeId
  })
    .sort({ updatedAt: -1 })
    .select("conversationId title updatedAt createdAt");

  return conversations.map(c => ({
    id: c.conversationId,
    title: c.title,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt
  }));
};

module.exports = {
  createConversation,
  getConversation,
  listConversations
};
