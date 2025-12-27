const express = require("express");
const router = express.Router();

const { aiSuggestionsEdit} = require("../controllers/editController");
const { askAI } = require("../controllers/askController");
const requireAuth = require("../middlewares/authMiddleware");

router.post("/edit", requireAuth, aiSuggestionsEdit);
router.post("/ask", requireAuth, askAI);



module.exports = router;