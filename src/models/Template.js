const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  previewUrl: { type: String, required: true },
  description: { type: String, required: true }
});

module.exports = mongoose.model("Template", TemplateSchema);
