const mongoose = require("mongoose");
const ResumeConversation = require("../models/resumeConversation");
const { v4: uuidv4 } = require("uuid");

/**
 * Create a brand new conversation with a generated UUID-like id.
 */
const createConversation = async (userId, templateKey, category, title) => {
  // Generate unique conversation ID
  const conversationId = uuidv4();

  const convo = new ResumeConversation({
    userId,
    templateKey,
    category,
    conversationId,
    title: title || "New conversation",
    messages: []
  });

  await convo.save();
  return convo;
};

/**
 * Fetch a single conversation owned by this user/template.
 */
const getConversation = async (userId, templateKey, category, conversationId) => {
  return await ResumeConversation.findOne({
    userId,
    templateKey,
    category,
    conversationId,
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