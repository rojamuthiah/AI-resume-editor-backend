const express = require("express");
const router = express.Router();
const { 
  getTemplates,
  getCategories,
  getTemplatesByCategory,
  createTemplate
} = require("../controllers/templateController");

router.get("/", getTemplates);
router.get("/categories", getCategories);
router.get("/category/:category", getTemplatesByCategory);

module.exports = router;