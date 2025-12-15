import { handleCORS } from '../../../../lib/api-helpers.js';
import { protect } from '../../../../lib/auth.js';
import { reservePortfolio, unreservePortfolio, isPortfolioReserved } from '../../../../lib/portfolio-reservation-helper.js';
import { findPortfolioById } from '../../../../lib/portfolio-helper.js';

/**
 * @swagger
 * /api/portfolio/{id}/reserve:
 *   post:
 *     summary: Reserve/save a portfolio
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Portfolio ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *   delete:
 *     summary: Unreserve/unsave a portfolio
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Portfolio ID
 *   get:
 *     summary: Check if portfolio is reserved by current user
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Portfolio ID
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleCORS(req, res)) return;

  // Set cache-control headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    // Check authentication
    const authResult = await protect(req);
    if (authResult.error) {
      return res.status(authResult.status).json({
        success: false,
        message: authResult.error
      });
    }

    const user = authResult.user;
    const { id } = req.query;

    // Verify portfolio exists
    const portfolio = await findPortfolioById(id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    if (req.method === 'POST') {
      // Reserve/save portfolio
      const { notes } = req.body;

      const reservation = await reservePortfolio(user._id.toString(), id, notes);

      res.json({
        success: true,
        message: 'Portfolio reserved successfully',
        data: {
          reservationId: reservation._id,
          portfolioId: id,
          notes: reservation.notes,
          reservedAt: reservation.createdAt
        }
      });
    } else if (req.method === 'DELETE') {
      // Unreserve/unsave portfolio
      const removed = await unreservePortfolio(user._id.toString(), id);

      if (removed) {
        res.json({
          success: true,
          message: 'Portfolio unreserved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Portfolio was not reserved'
        });
      }
    } else if (req.method === 'GET') {
      // Check if reserved
      const reserved = await isPortfolioReserved(user._id.toString(), id);

      res.json({
        success: true,
        data: {
          isReserved: reserved
        }
      });
    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Portfolio reservation error:', error);
    
    // Handle MongoDB connection errors
    const isMongoConnectionError =
      error.name === 'MongooseServerSelectionError' ||
      error.name === 'MongoServerSelectionError' ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('connect ECONNREFUSED') ||
      error.message?.includes('connection skipped');

    if (isMongoConnectionError) {
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please ensure MongoDB is running and try again.'
      });
    }

    // Handle duplicate key error (already reserved)
    if (error.code === 11000 || error.message.includes('duplicate')) {
      return res.status(400).json({
        success: false,
        message: 'Portfolio is already reserved'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error processing portfolio reservation'
    });
  }
}

