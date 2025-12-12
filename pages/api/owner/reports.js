import connectDB from '../../../lib/mongodb.js';
import Olympiad from '../../../models/Olympiad.js';
import Result from '../../../models/Result.js';
import { protect } from '../../../lib/auth.js';
import { authorize } from '../../../lib/auth.js';

export default async function handler(req, res) {
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

    const roleError = authorize('owner')(authResult.user);
    if (roleError) {
      return res.status(roleError.status).json({ 
        success: false,
        message: roleError.error 
      });
    }

    await connectDB();

    const { olympiadId } = req.query;

    if (olympiadId) {
      // Detailed report for specific olympiad
      const olympiad = await Olympiad.findById(olympiadId);
      const results = await Result.find({ olympiadId })
        .populate('userId', 'name email')
        .sort({ totalScore: -1 });

      return res.json({
        success: true,
        data: {
          olympiad,
          results,
          summary: {
            totalParticipants: results.length,
            averageScore: results.length > 0
              ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length
              : 0,
            highestScore: results.length > 0 ? results[0].percentage : 0,
          },
        },
      });
    }

    // General reports for all olympiads
    const olympiads = await Olympiad.find().populate('createdBy', 'name');
    const reports = await Promise.all(
      olympiads.map(async (olympiad) => {
        const results = await Result.find({ olympiadId: olympiad._id });
        return {
          olympiad: {
            _id: olympiad._id,
            title: olympiad.title,
            status: olympiad.status,
            olympiadLogo: olympiad.olympiadLogo || null,
          },
          participants: results.length,
          averageScore: results.length > 0
            ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length
            : 0,
        };
      })
    );

    res.json({
      reports: reports.map(r => ({
        type: 'performance',
        data: r,
      })),
    });
  } catch (error) {
    console.error('Owner reports error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
}
