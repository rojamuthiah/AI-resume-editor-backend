const multer = require("multer");

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only PDF and DOCX files are allowed"),
        false
      );
    }

    cb(null, true);
  }
});

module.exports = upload;
