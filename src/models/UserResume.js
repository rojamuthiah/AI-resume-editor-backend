const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const userResumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  templateKey: { type: String, required: true },
  resumeJson: { type: Object, required: true },
  conversation: [messageSchema], // used later for AI
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UserResume", userResumeSchema);
