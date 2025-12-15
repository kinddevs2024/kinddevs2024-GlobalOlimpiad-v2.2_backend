import { handleCORS } from '../../../lib/api-helpers.js';
import { protect } from '../../../lib/auth.js';
import { generatePortfolioFromText, sanitizeText } from '../../../lib/portfolio-generator.js';

/**
 * @swagger
 * /api/portfolio/generate-from-text:
 *   post:
 *     summary: Generate portfolio structure from text description
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Plain text description of the portfolio
 *     responses:
 *       200:
 *         description: Generated portfolio structure
 *       400:
 *         description: Bad request
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

  if (req.method !== 'POST') {
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

    // Check if user is a student
    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can generate portfolios'
      });
    }

    const { text } = req.body;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text input is required and must be a non-empty string'
      });
    }

    // Sanitize text
    const sanitizedText = sanitizeText(text);

    if (sanitizedText.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text input is invalid or contains only unsafe content'
      });
    }

    // Generate portfolio structure
    const portfolioStructure = generatePortfolioFromText(sanitizedText);

    res.json({
      success: true,
      message: 'Portfolio structure generated successfully',
      data: portfolioStructure
    });
  } catch (error) {
    console.error('Generate portfolio error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error generating portfolio structure'
    });
  }
}

