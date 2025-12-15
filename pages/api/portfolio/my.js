import { handleCORS } from '../../../lib/api-helpers.js';
import { protect } from '../../../lib/auth.js';
import { findPortfoliosByStudentId } from '../../../lib/portfolio-helper.js';

/**
 * @swagger
 * /api/portfolio/my:
 *   get:
 *     summary: Get current user's portfolios
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's portfolios
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleCORS(req, res)) return;

  // Set cache-control headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

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

    // Get all portfolios for the current user
    const portfolios = await findPortfoliosByStudentId(user._id.toString());

    res.json({
      success: true,
      data: portfolios,
      count: portfolios.length
    });
  } catch (error) {
    console.error('Get my portfolios error:', error);
    
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

    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving portfolios'
    });
  }
}

