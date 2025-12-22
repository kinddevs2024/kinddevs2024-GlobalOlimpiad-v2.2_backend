import { handleCORS } from "../../../../lib/api-helpers.js";
import { protect } from "../../../../lib/auth.js";
import { getVerificationHistory } from "../../../../lib/verification-helper.js";

/**
 * @swagger
 * /api/verification/{blockId}/history:
 *   get:
 *     summary: Get verification history for a block
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blockId
 *         required: true
 *         schema:
 *           type: string
 *         description: Block ID
 *     responses:
 *       200:
 *         description: Verification history
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Block not found
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

  if (req.method !== "GET") {
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

    const { blockId } = req.query;

    if (!blockId) {
      return res.status(400).json({
        success: false,
        message: "Block ID is required",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    // Get verification history
    const allHistory = await getVerificationHistory(blockId);
    const total = allHistory.length;
    const history = allHistory.slice(skip, skip + limit);

    res.json({
      success: true,
      data: history,
      count: history.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get verification history error:", error);

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

    res.status(500).json({
      success: false,
      message: "Error retrieving verification history",
    });
  }
}

