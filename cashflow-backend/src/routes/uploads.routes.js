// src/routes/uploads.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadExpenseReceipt } = require("../services/s3.service");
const { authenticateToken } = require("../middleware/auth");

// 🛡️ Security: Filter allowed file types

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
    "text/csv", // .csv
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPG, PNG, PDF, CSV, and Excel files are allowed.",
      ),
      false,
    );
  }
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter,
});

// POST /api/uploads/receipt
router.post(
  "/receipt",
  authenticateToken,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Call our clean S3 service
      const fileUrl = await uploadExpenseReceipt(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );

      return res.status(201).json({ url: fileUrl });
    } catch (error) {
      // Pass errors to our Global Error Handler
      next(error);
    }
  },
);

module.exports = router;
