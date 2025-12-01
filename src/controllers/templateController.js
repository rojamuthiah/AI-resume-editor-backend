const Template = require("../models/Template");

exports.getTemplates = async (req, res) => {
  try {
    const templates = await Template.find({});
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
