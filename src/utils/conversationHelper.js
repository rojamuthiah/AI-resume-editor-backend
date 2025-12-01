const mongoose = require("mongoose");
const ResumeConversation = require("../models/resumeConversation");

/**
 * Create a brand new conversation with a generated UUID-like id.
 */
const createConversation = async (userId, templateKey, title) => {
  // Generate unique conversation ID
  const conversationId = new mongoose.Types.ObjectId().toString();

  const convo = await ResumeConversation.create({
    userId,
    templateKey,
    conversationId,
    title: title || "New conversation",
    messages: []
  });

  return convo;
};

/**
 * Fetch a single conversation owned by this user/template.
 */
const getConversation = async (userId, templateKey, conversationId) => {
  if (!conversationId) return null;
  
  return ResumeConversation.findOne({ 
    userId, 
    templateKey, 
    conversationId 
  });
};

/**
 * List all conversations for a user + template (for dropdown).
 */
const listConversations = async (userId, templateKey) => {
  const conversations = await ResumeConversation.find({ 
    userId, 
    templateKey 
  })
    .sort({ updatedAt: -1 })
    .select("conversationId title updatedAt createdAt");

  return conversations.map((c) => ({
    id: c.conversationId,
    title: c.title,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt
  }));
};

module.exports = {
  createConversation,
  getConversation,
  listConversations,
};