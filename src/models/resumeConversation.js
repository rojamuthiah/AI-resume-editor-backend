const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    type: { type: String, enum: ["ask", "edit"], required: true },
    content: { type: String, required: true }, // ask text OR edit JSON string
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const resumeConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    templateKey: { type: String, required: true },
    conversationId: { type: String, required: true },
    title: { type: String, required: true },
    messages: { type: [messageSchema], default: [] }
  },
  { timestamps: true }
);

resumeConversationSchema.index(
  { userId: 1, templateKey: 1, conversationId: 1 },
  { unique: true }
);

module.exports = mongoose.model("ResumeConversation", resumeConversationSchema);
