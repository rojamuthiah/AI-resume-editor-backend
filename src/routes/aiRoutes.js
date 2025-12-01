const express = require("express");
const router = express.Router();

const { editAI, acceptEdit } = require("../controllers/aiController");
const { askAI } = require("../controllers/askController");
const requireAuth = require("../middlewares/authMiddleware");

router.post("/edit", requireAuth, editAI);
router.post("/ask", requireAuth, askAI);
router.post("/accept", requireAuth, acceptEdit);

module.exports = router;