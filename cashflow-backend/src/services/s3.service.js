// src/services/s3.service.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a buffer to S3 and returns the public URL.
 */
const uploadExpenseReceipt = async (fileBuffer, originalName, mimeType) => {
  // 1. Clean the filename and add a timestamp to prevent overwriting
  const cleanName = originalName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_.-]/g, "");
  const key = `expenses/${Date.now()}-${cleanName}`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    // Return the formatted URL
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error("AWS S3 Upload Error:", error);
    throw new Error("Failed to upload file to cloud storage.");
  }
};

module.exports = { uploadExpenseReceipt };
