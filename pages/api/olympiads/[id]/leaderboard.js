import { connectDB } from '../../../../lib/json-db.js';
import { findOlympiadById } from '../../../../lib/olympiad-helper.js';
import { findResultsByOlympiadId } from '../../../../lib/result-helper.js';
import { findUserById } from '../../../../lib/user-helper.js';
import { protect } from '../../../../lib/auth.js';

/**
 * Get leaderboard for an olympiad
 * GET /api/olympiads/:id/leaderboard
 */
export default async function handler(req, res) {
  // Set cache-control headers to prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authResult = await protect(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ 
        success: false,
        message: authResult.error 
      });
    }

    await connectDB();

    const { id: olympiadId } = req.query;
    const olympiad = findOlympiadById(olympiadId);

    if (!olympiad) {
      return res.status(404).json({ 
        success: false,
        message: 'Olympiad not found' 
      });
    }

    // Get all results for this olympiad
    // Show results that are: (checked + visible) OR (just visible)
    // checked + visible = publicly viewable by anyone
    const allResultsRaw = findResultsByOlympiadId(olympiadId);
    const allResults = allResultsRaw
      .filter(r => {
        // Publicly viewable: checked status + visible
        if (r.status === 'checked' && r.visible === true) return true;
        // Regular visible results
        if (r.visible !== false) return true;
        return false;
      })
      .sort((a, b) => {
        // Sort by score (descending), then by completion time (ascending - faster is better)
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        return new Date(a.completedAt) - new Date(b.completedAt);
      });

    // Populate user information
    const leaderboard = allResults.map((result, index) => {
      const user = findUserById(result.userId);
      
      // Determine position label
      let position = '';
      if (index === 0) position = '🥇 1st Place';
      else if (index === 1) position = '🥈 2nd Place';
      else if (index === 2) position = '🥉 3rd Place';
      else position = `${index + 1}th Place`;
      
      return {
        rank: index + 1,
        position,
        userId: result.userId,
        userName: user ? user.name : 'Unknown',
        userEmail: user ? user.email : 'Unknown',
        score: result.totalScore,
        totalPoints: result.maxScore,
        percentage: Math.round(result.percentage * 100) / 100,
        completedAt: result.completedAt,
        timeSpent: result.timeSpent || 0,
      };
    });

    res.json({
      success: true,
      olympiadId: olympiad._id,
      olympiadTitle: olympiad.title,
      olympiadType: olympiad.type,
      totalParticipants: leaderboard.length,
      leaderboard,
      topThree: leaderboard.slice(0, 3),
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
}

