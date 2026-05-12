// src/middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
  console.error(err.stack); // Log the full stack trace for debugging

  // Handle Multer file type errors specifically
  if (err.message.includes("Invalid file type")) {
    return res.status(400).json({
      status: "error",
      message: err.message,
    });
  }

  // Default to 500 Internal Server Error
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    status: "error",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : message,
  });
};

module.exports = errorHandler;
