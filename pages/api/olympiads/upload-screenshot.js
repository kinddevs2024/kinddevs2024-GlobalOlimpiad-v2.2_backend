import connectDB from "../../../lib/mongodb.js";
import CameraCapture from "../../../models/CameraCapture.js";
import { protect } from "../../../lib/auth.js";
import {
  parseForm,
  saveFile,
  config,
} from "../../../lib/upload.js";
import {
  readDB,
  writeDB,
  generateId,
  connectDB as connectJSONDB,
} from "../../../lib/json-db.js";

export { config };

/**
 * Screenshot Upload Endpoint
 * POST /api/olympiads/upload-screenshot
 * 
 * Accepts screenshot images when a user leaves a tab,
 * saves them to user-specific folders.
 * 
 * Request:
 *   Headers: Authorization: Bearer <token>
 *   Body (FormData):
 *     - screenshot: File (Image file - PNG, JPG, etc.)
 *     - olympiadId: String (optional)
 *     - username: String (optional, for identification)
 * 
 * Response:
 *   {
 *     "success": true,
 *     "message": "Screenshot uploaded successfully",
 *     "screenshotId": "screenshot_id_123",
 *     "filename": "users/user123/screenshot-xyz.jpg",
 *     "fileUrl": "/api/uploads/users/user123/screenshot-xyz.jpg"
 *   }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Verify JWT authentication
    const authResult = await protect(req);
    if (authResult.error) {
      return res.status(authResult.status).json({
        success: false,
        message: authResult.error,
      });
    }

    // Try to connect to MongoDB, fallback to JSON DB if it fails
    let useMongoDB = false;
    try {
      await connectDB();
      useMongoDB = true;
    } catch (mongoError) {
      const isMongoConnectionError =
        mongoError.name === "MongooseServerSelectionError" ||
        mongoError.name === "MongoServerSelectionError" ||
        mongoError.message?.includes("ECONNREFUSED") ||
        mongoError.message?.includes("connect ECONNREFUSED") ||
        mongoError.message?.includes("connection skipped");

      if (isMongoConnectionError) {
        const now = Date.now();
        if (!global.lastMongoWarning || now - global.lastMongoWarning > 60000) {
          console.warn("⚠️ MongoDB unavailable, using JSON database fallback");
          global.lastMongoWarning = now;
        }
        await connectJSONDB();
        useMongoDB = false;
      } else {
        throw mongoError;
      }
    }

    // Parse form data
    let fields, files;
    try {
      const parsed = await parseForm(req);
      fields = parsed.fields;
      files = parsed.files;
    } catch (parseError) {
      console.error("Error parsing form data:", parseError);
      return res.status(400).json({
        success: false,
        message: "Error parsing form data: " + parseError.message,
      });
    }

    const { olympiadId, username } = fields || {};

    // Get screenshot file (can be 'screenshot' or 'image')
    const screenshotFile =
      files?.screenshot || files?.image
        ? Array.isArray(files.screenshot || files.image)
          ? (files.screenshot || files.image)[0]
          : files.screenshot || files.image
        : null;

    if (!screenshotFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload a screenshot file",
        receivedFiles: files ? Object.keys(files) : [],
      });
    }

    // Verify it's an image file
    const imageMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!imageMimeTypes.includes(screenshotFile.mimetype?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message:
          "File must be an image (received: " +
          (screenshotFile.mimetype || "unknown") +
          ")",
      });
    }

    // Get user ID for folder organization
    // Use username if provided, otherwise use authenticated user ID
    const userId = authResult.user._id.toString();
    const userIdentifier = username || userId;

    // Save screenshot to user-specific folder
    let savedFile;
    try {
      savedFile = await saveFile(
        screenshotFile,
        process.env.UPLOAD_PATH || "./uploads",
        userId // Always use authenticated user's folder
      );
    } catch (saveError) {
      console.error("Error saving screenshot:", saveError);
      return res.status(500).json({
        success: false,
        message: "Error saving screenshot: " + saveError.message,
        error:
          process.env.NODE_ENV === "development" ? saveError.stack : undefined,
      });
    }

    // Use relative path for database storage
    const screenshotPath = savedFile.relativePath || savedFile.path;

    // Store metadata in database
    let capture;
    if (useMongoDB) {
      // Use MongoDB
      capture = await CameraCapture.create({
        userId: authResult.user._id,
        olympiadId: olympiadId?.toString() || null,
        imagePath: screenshotPath,
        captureType: "screenshot", // Mark as screenshot
      });
    } else {
      // Use JSON DB as fallback
      const captures = readDB("cameraCaptures");
      capture = {
        _id: generateId(),
        userId: userId,
        olympiadId: olympiadId?.toString() || null,
        imagePath: screenshotPath,
        captureType: "screenshot",
        username: userIdentifier, // Store username if provided
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      captures.push(capture);
      writeDB("cameraCaptures", captures);
    }

    // Generate file URL for accessing the file
    const fileUrl = `/api/uploads/${savedFile.name}`;

    // Return success response
    res.json({
      success: true,
      message: "Screenshot uploaded successfully",
      screenshotId: capture._id.toString(),
      filename: savedFile.name,
      size: savedFile.size,
      fileUrl: fileUrl,
      username: userIdentifier,
      storage: useMongoDB ? "mongodb" : "json",
    });
  } catch (error) {
    console.error("Screenshot upload error:", error);
    console.error("Error stack:", error.stack);

    // Check if it's a MongoDB connection error
    const isMongoConnectionError =
      error.name === "MongooseServerSelectionError" ||
      error.name === "MongoServerSelectionError" ||
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("connect ECONNREFUSED");

    if (isMongoConnectionError) {
      return res.status(503).json({
        success: false,
        message:
          "Database service is currently unavailable. Please ensure MongoDB is running or check your connection settings.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "An unexpected error occurred",
      error:
        process.env.NODE_ENV === "development"
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : undefined,
    });
  }
}

