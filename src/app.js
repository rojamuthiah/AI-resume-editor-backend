const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const templateRoutes = require("./routes/templateRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const airoutes = require("./routes/aiRoutes");
const conversationroutes = require("./routes/conversationRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/templates", express.static("templates"));
app.use("/api/templates", templateRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/ai",airoutes)
app.use("/api/convo",conversationroutes)


module.exports = app;
