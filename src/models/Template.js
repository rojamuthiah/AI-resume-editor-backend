const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  category: { 
    type: String, 
    enum: ["software_engineering", "sales_marketing", "hr_finance"],
    required: true
  },
  description: { type: String, required: true },
  previewUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Template", templateSchema);