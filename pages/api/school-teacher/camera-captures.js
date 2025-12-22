import { connectDB } from '../../../lib/json-db.js';
import { findOlympiadById } from '../../../lib/olympiad-helper.js';
import { readDB } from '../../../lib/json-db.js';
import { getAllUsers, findUserById } from '../../../lib/user-helper.js';
import { protect } from '../../../lib/auth.js';
import { authorize } from '../../../lib/auth.js';
import connectDBMongo from '../../../lib/mongodb.js';
import CameraCapture from '../../../models/CameraCapture.js';

/**
 * Get camera captures for users from school-teacher's school
 * GET /api/school-teacher/camera-captures?olympiadId=:id
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

    // Check if user is school-teacher
    const roleError = authorize('school-teacher')(authResult.user);
    if (roleError) {
      return res.status(roleError.status).json({ 
        success: false,
        message: roleError.error 
      });
    }

    await connectDB();

    const teacher = authResult.user;
    
    // Get teacher's school information
    const teacherSchoolName = teacher.schoolName;
    const teacherSchoolId = teacher.schoolId;

    if (!teacherSchoolName && !teacherSchoolId) {
      return res.status(400).json({ 
        success: false,
        message: 'School teacher must have schoolName or schoolId assigned' 
      });
    }

    const { olympiadId } = req.query;
    if (!olympiadId) {
      return res.status(400).json({ 
        success: false,
        message: 'olympiadId query parameter is required' 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const olympiad = findOlympiadById(olympiadId);
    if (!olympiad) {
      return res.status(404).json({ 
        success: false,
        message: 'Olympiad not found' 
      });
    }

    // Get all users from the same school
    const allUsers = getAllUsers();
    const schoolUserIds = allUsers
      .filter(user => {
        // Match by schoolId if both have it, otherwise match by schoolName
        if (teacherSchoolId && user.schoolId) {
          return user.schoolId === teacherSchoolId;
        }
        if (teacherSchoolName && user.schoolName) {
          return user.schoolName.toLowerCase() === teacherSchoolName.toLowerCase();
        }
        return false;
      })
      .map(user => user._id);

    // Try MongoDB first, fallback to JSON DB
    let captures = [];
    let useMongoDB = false;
    let total = 0;

    try {
      await connectDBMongo();
      useMongoDB = true;
      const filter = { olympiadId, userId: { $in: schoolUserIds } };
      total = await CameraCapture.countDocuments(filter);
      const mongoCaptures = await CameraCapture.find(filter)
        .populate('userId', 'name email')
        .select('_id userId olympiadId imagePath captureType timestamp createdAt')
        .sort({ timestamp: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      captures = mongoCaptures.map(c => ({
        _id: c._id.toString(),
        userId: c.userId?._id?.toString() || c.userId?.toString() || '',
        olympiadId: c.olympiadId.toString(),
        imagePath: c.imagePath,
        captureType: c.captureType,
        timestamp: c.timestamp,
        createdAt: c.createdAt,
        user: {
          name: c.userId?.name || 'Unknown',
          email: c.userId?.email || 'Unknown',
        },
      }));
    } catch (mongoError) {
      // Fallback to JSON DB
      const allCaptures = readDB('cameraCaptures');
      const filteredCaptures = allCaptures.filter(c => 
        c.olympiadId === olympiadId && schoolUserIds.includes(c.userId)
      );
      total = filteredCaptures.length;
      captures = filteredCaptures
        .sort((a, b) => {
          const timeA = new Date(a.timestamp || a.createdAt);
          const timeB = new Date(b.timestamp || b.createdAt);
          return timeB - timeA;
        })
        .slice(skip, skip + limit);
    }

    // Populate user info if not already populated
    const capturesWithDetails = captures.map(capture => {
      const user = findUserById(capture.userId);
      return {
        _id: capture._id,
        olympiadId: capture.olympiadId,
        userId: capture.userId,
        user: capture.user || {
          name: user ? user.name : 'Unknown',
          email: user ? user.email : 'Unknown',
        },
        imagePath: capture.imagePath,
        imageUrl: capture.imagePath.startsWith('/') 
          ? `/api${capture.imagePath}` 
          : `/api/uploads/${capture.imagePath.split('/').pop()}`,
        captureType: capture.captureType,
        timestamp: capture.timestamp || capture.createdAt,
        createdAt: capture.createdAt,
      };
    });

    return res.json({
      success: true,
      olympiadId: olympiad._id,
      olympiadTitle: olympiad.title,
      olympiadLogo: olympiad.olympiadLogo || null,
      schoolName: teacherSchoolName,
      schoolId: teacherSchoolId,
      captures: capturesWithDetails,
      totalCaptures: total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      storage: useMongoDB ? 'mongodb' : 'json',
    });
  } catch (error) {
    console.error('Get school camera captures error:', error);

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
      message: "Error retrieving camera captures"
    });
  }
}

