const mongoose = require("mongoose");

const userResumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  templateKey: { type: String, required: true },
  category: { 
    type: String, 
    enum: ["software_engineering", "sales_marketing", "hr_finance"],
    required: true
  },
  resumeJson: { type: Object, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

userResumeSchema.index({ userId: 1, templateKey: 1 });

module.exports = mongoose.model("UserResume", userResumeSchema);