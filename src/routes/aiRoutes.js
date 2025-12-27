const express = require("express");
const router = express.Router();

const { aiSuggestionsEdit} = require("../controllers/editController");
const { askAI } = require("../controllers/askController");
const {acceptEdit} = require("../controllers/acceptEditController")
const requireAuth = require("../middlewares/authMiddleware");

router.post("/suggestion", requireAuth, aiSuggestionsEdit);
router.post("/ask", requireAuth, askAI);
router.post("/accept-edit",requireAuth, acceptEdit)
router


module.exports = router;