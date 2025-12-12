// API helper functions for Next.js API routes

// Handle CORS for all API routes
export function handleCORS(req, res) {
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(200).end();
    return true;
  }

  // Set CORS headers for actual requests
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  return false;
}

// Standard error response
export function sendError(res, status, message, error = null) {
  const response = { message };
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error.message || error;
  }
  return res.status(status).json(response);
}

