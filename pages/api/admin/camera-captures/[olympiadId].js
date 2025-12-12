import connectDBMongo from '../../../../lib/mongodb.js';
import CameraCapture from '../../../../models/CameraCapture.js';
import { protect } from '../../../../lib/auth.js';
import { authorize } from '../../../../lib/auth.js';
import { readDB, connectDB } from '../../../../lib/json-db.js';
import { findUserById } from '../../../../lib/user-helper.js';

export default async function handler(req, res) {
  // Set cache-control headers to prevent caching for real-time viewing
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

    // Allow admin, owner, and school-teacher
    const roleError = authorize('admin', 'owner', 'school-teacher')(authResult.user);
    if (roleError) {
      return res.status(roleError.status).json({ 
        success: false,
        message: roleError.error 
      });
    }

    await connectDB();

    const { olympiadId } = req.query;

    if (!olympiadId) {
      return res.status(400).json({ 
        success: false,
        message: 'olympiadId query parameter is required' 
      });
    }

    // Try MongoDB first, fallback to JSON DB
    let captures = [];
    let useMongoDB = false;

    try {
      await connectDBMongo();
      useMongoDB = true;
      const mongoCaptures = await CameraCapture.find({ olympiadId })
        .populate('userId', 'name email')
        .sort({ timestamp: -1 });
      
      captures = mongoCaptures.map(capture => ({
        _id: capture._id.toString(),
        olympiadId: capture.olympiadId.toString(),
        userId: capture.userId._id.toString(),
        user: {
          name: capture.userId.name,
          email: capture.userId.email,
        },
        imagePath: capture.imagePath,
        imageUrl: `/api/uploads/${capture.imagePath}`,
        captureType: capture.captureType,
        timestamp: capture.timestamp,
        createdAt: capture.createdAt,
      }));
    } catch (mongoError) {
      // Fallback to JSON DB
      const allCaptures = readDB('cameraCaptures');
      captures = allCaptures
        .filter(c => c.olympiadId === olympiadId)
        .sort((a, b) => {
          const timeA = new Date(a.timestamp || a.createdAt);
          const timeB = new Date(b.timestamp || b.createdAt);
          return timeB - timeA;
        })
        .map(capture => {
          const user = findUserById(capture.userId);
          return {
            _id: capture._id,
            olympiadId: capture.olympiadId,
            userId: capture.userId,
            user: {
              name: user ? user.name : 'Unknown',
              email: user ? user.email : 'Unknown',
            },
            imagePath: capture.imagePath,
            imageUrl: `/api/uploads/${capture.imagePath}`,
            captureType: capture.captureType,
            timestamp: capture.timestamp || capture.createdAt,
            createdAt: capture.createdAt,
          };
        });
    }

    // If school-teacher, filter by school
    if (authResult.user.role === 'school-teacher') {
      const teacher = authResult.user;
      const teacherSchoolName = teacher.schoolName;
      const teacherSchoolId = teacher.schoolId;

      if (teacherSchoolName || teacherSchoolId) {
        captures = captures.filter(capture => {
          const user = findUserById(capture.userId);
          if (!user) return false;

          // Match by schoolId if both have it, otherwise match by schoolName
          if (teacherSchoolId && user.schoolId) {
            return user.schoolId === teacherSchoolId;
          }
          if (teacherSchoolName && user.schoolName) {
            return user.schoolName.toLowerCase() === teacherSchoolName.toLowerCase();
          }
          return false;
        });
      }
    }

    res.json({
      success: true,
      olympiadId,
      captures,
      total: captures.length,
      storage: useMongoDB ? 'mongodb' : 'json',
    });
  } catch (error) {
    console.error('Get camera captures error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
}
