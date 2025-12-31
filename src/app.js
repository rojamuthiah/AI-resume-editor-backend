const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const templateRoutes = require("./routes/templateRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const airoutes = require("./routes/aiRoutes");
const conversationroutes = require("./routes/conversationRoutes");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://job-editor-frontend.vercel.app" // add when deployed
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition"],
  })
);


app.use(cookieParser());
app.use(express.json());

app.head("/api/health", (req, res) => {
  res.sendStatus(200);
});

// Health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});



app.use("/api/auth", authRoutes);
app.use("/templates", express.static("templates"));
app.use("/api/templates", templateRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/ai", airoutes);
app.use("/api/convo", conversationroutes);

module.exports = app;
