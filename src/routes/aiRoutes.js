const express = require("express");
const router = express.Router();

const { aiSuggestionsEdit} = require("../controllers/editController");
const { askAI } = require("../controllers/askController");
const { acceptEdit, revertEdit } = require("../controllers/acceptEditController");
const { analyzeResume } = require("../controllers/analysercontroller");
const requireAuth = require("../middlewares/authMiddleware");

router.post("/edit", requireAuth, aiSuggestionsEdit);
router.post("/ask", requireAuth, askAI);
router.post("/accept", requireAuth, acceptEdit);
router.post("/revert", requireAuth, revertEdit);
router.post("/analyse",requireAuth, analyzeResume);

module.exports = router;