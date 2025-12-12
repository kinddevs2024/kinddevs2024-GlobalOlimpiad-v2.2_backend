import { connectDB } from '../../../lib/json-db.js';
import { getAllUsers } from '../../../lib/user-helper.js';
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

    const roleError = authorize('admin', 'owner')(authResult.user);
    if (roleError) {
      return res.status(roleError.status).json({ 
        success: false,
        message: roleError.error 
      });
    }

    await connectDB();

    const users = getAllUsers()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(user => ({
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      }));

    res.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
}
