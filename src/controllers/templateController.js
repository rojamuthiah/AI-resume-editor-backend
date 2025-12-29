const Template = require("../models/Template");

const CATEGORIES = [
  { key: "software_engineering", label: "Software Engineering" },
  { key: "sales_marketing", label: "Sales & Marketing" },
  { key: "hr_finance", label: "HR & Finance" }
];

exports.getTemplates = async (req, res) => {
  try {
    const templates = await Template.find({});
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    res.json({ success: true, categories: CATEGORIES });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTemplatesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const validCategories = ["software_engineering", "sales_marketing", "hr_finance"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }
    
    const templates = await Template.find({ category });
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const { name, key, category, description, previewUrl } = req.body;
    
    if (!name || !key || !category || !description || !previewUrl) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    
    const validCategories = ["software_engineering", "sales_marketing", "hr_finance"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }
    
    const template = await Template.create({
      name,
      key,
      category,
      description,
      previewUrl
    });
    
    res.status(201).json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};