import { handleCORS } from "../../../lib/api-helpers.js";
import { protect } from "../../../lib/auth.js";
import { parseForm, saveFile } from "../../../lib/upload.js";
import path from "path";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * @swagger
 * /api/upload/certificates:
 *   post:
 *     summary: Upload certificate file (image or PDF)
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleCORS(req, res)) return;

  // Set cache-control headers
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Check authentication
    const authResult = await protect(req);
    if (authResult.error) {
      return res.status(authResult.status).json({
        success: false,
        message: authResult.error,
      });
    }

    const user = authResult.user;

    // Check if user is a student
    if (user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can upload certificates",
      });
    }

    // Parse form data
    const { fields, files } = await parseForm(req, "./uploads/certificates");

    // Get file (handle both single file and array)
    // Try different common field names
    let file =
      files.file ||
      files.certificate ||
      files.upload ||
      files.image ||
      files.pdf;

    // Handle array
    if (Array.isArray(file)) {
      file = file[0];
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message:
          'No file provided. Please ensure the file is sent in a field named "file", "certificate", "upload", "image", or "pdf".',
      });
    }

    // Validate file type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      // Clean up uploaded file
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      return res.status(400).json({
        success: false,
        message:
          "Invalid file type. Only JPEG, PNG, and PDF files are allowed.",
      });
    }

    // Validate file size
    const maxSizeImages = 10 * 1024 * 1024; // 10MB for images
    const maxSizePDF = 20 * 1024 * 1024; // 20MB for PDFs
    const maxSize =
      file.mimetype === "application/pdf" ? maxSizePDF : maxSizeImages;

    if (file.size > maxSize) {
      // Clean up uploaded file
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      return res.status(400).json({
        success: false,
        message: `File size exceeds limit. Maximum size: ${
          maxSize / (1024 * 1024)
        }MB`,
      });
    }

    // Save file
    const savedFile = await saveFile(
      file,
      "./uploads/certificates",
      user._id.toString()
    );

    // Generate file URL
    const fileUrl = `/api/uploads/${savedFile.name}`;

    res.json({
      success: true,
      message: "Certificate uploaded successfully",
      data: {
        fileUrl,
        fileName: savedFile.name,
        fileType: savedFile.type,
        size: savedFile.size,
      },
    });
  } catch (error) {
    console.error("Upload certificate error:", error);

    // Handle MongoDB connection errors
    const isMongoConnectionError =
      error.name === "MongooseServerSelectionError" ||
      error.name === "MongoServerSelectionError" ||
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("connect ECONNREFUSED") ||
      error.message?.includes("connection skipped");

    if (isMongoConnectionError) {
      return res.status(503).json({
        success: false,
        message:
          "Database service is currently unavailable. Please ensure MongoDB is running and try again.",
      });
    }

    // Handle form parsing errors
    if (error.message?.includes("parse") || error.message?.includes("form")) {
      return res.status(400).json({
        success: false,
        message:
          'Error parsing form data. Please ensure you are sending a file in the "file" field.',
      });
    }

    // If error already has a status code, use it
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message || "Error uploading certificate",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Error uploading certificate",
    });
  }
}
