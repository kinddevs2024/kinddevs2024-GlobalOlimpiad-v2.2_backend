import { handleCORS } from '../../../lib/api-helpers.js';
import { protect } from '../../../lib/auth.js';
import { createPortfolioView, hashIP } from '../../../lib/analytics-helper.js';
import { findPortfolioById } from '../../../lib/portfolio-helper.js';

/**
 * @swagger
 * /api/analytics/view:
 *   post:
 *     summary: Track portfolio view
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - portfolioId
 *               - viewerType
 *             properties:
 *               portfolioId:
 *                 type: string
 *               viewerType:
 *                 type: string
 *                 enum: [public, university]
 *     responses:
 *       200:
 *         description: View tracked successfully
 *       400:
 *         description: Bad request
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleCORS(req, res)) return;

  // Set cache-control headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    const { portfolioId, viewerType } = req.body;

    // Validate required fields
    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        message: 'Portfolio ID is required'
      });
    }

    if (!viewerType || !['public', 'university'].includes(viewerType)) {
      return res.status(400).json({
        success: false,
        message: 'Viewer type must be either "public" or "university"'
      });
    }

    // Verify portfolio exists
    const portfolio = await findPortfolioById(portfolioId);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    // Get IP address and hash it
    const ip = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               'unknown';
    
    // Handle multiple IPs (x-forwarded-for can contain multiple IPs)
    const clientIP = ip.split(',')[0].trim();
    const ipHash = hashIP(clientIP);

    // Get user agent
    const userAgent = req.headers['user-agent'] || null;

    // Create view record
    const view = await createPortfolioView({
      portfolioId,
      viewerType,
      ipHash,
      userAgent
    });

    res.json({
      success: true,
      message: 'View tracked successfully',
      data: {
        viewId: view._id,
        timestamp: view.timestamp
      }
    });
  } catch (error) {
    console.error('Track view error:', error);
    
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
      message: error.message || 'Error tracking view'
    });
  }
}

