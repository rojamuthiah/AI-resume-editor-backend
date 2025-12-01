const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const templateRoutes = require("./routes/templateRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const airoutes = require("./routes/aiRoutes")

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/templates", express.static("templates"));
app.use("/api/templates", templateRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/ai",airoutes)

module.exports = app;
