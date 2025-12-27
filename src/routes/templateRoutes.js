const express = require("express");
const router = express.Router();
const { getTemplates } = require("../controllers/templateController")

router.get("/", getTemplates);

module.exports = router;
