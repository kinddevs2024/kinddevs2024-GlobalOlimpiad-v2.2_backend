import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { verifyToken } from './lib/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file explicitly from multiple possible locations
const possibleEnvPaths = [
  path.join(process.cwd(), '.env'),           // Current working directory
  path.join(__dirname, '.env'),               // Same directory as server.js
  path.join(__dirname, '..', '.env'),         // Parent directory
  '.env',                                      // Default location
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  try {
    const result = dotenv.config({ path: envPath, override: true });
    if (result.parsed && result.parsed.JWT_SECRET) {
      process.env.JWT_SECRET = result.parsed.JWT_SECRET;
      envLoaded = true;
      console.log(`✅ Loaded .env from: ${envPath}`);
      break;
    }
    if (process.env.JWT_SECRET) {
      envLoaded = true;
      console.log(`✅ Loaded .env from: ${envPath}`);
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

// Also try default location as fallback
if (!envLoaded) {
  try {
    const result = dotenv.config({ override: true });
    if (result.parsed && result.parsed.JWT_SECRET) {
      process.env.JWT_SECRET = result.parsed.JWT_SECRET;
      envLoaded = true;
    }
  } catch (error) {
    // Ignore
  }
}

// Last resort: Read .env file directly and parse manually
if (!process.env.JWT_SECRET) {
  for (const envPath of possibleEnvPaths) {
    try {
      if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf8');
        const lines = envContent.split(/\r?\n/);
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith('#')) continue;
          
          if (trimmedLine.startsWith('JWT_SECRET=')) {
            let value = trimmedLine.substring('JWT_SECRET='.length).trim();
            // Remove comments
            const commentIndex = value.indexOf('#');
            if (commentIndex !== -1) {
              value = value.substring(0, commentIndex).trim();
            }
            // Remove surrounding quotes
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (value) {
              process.env.JWT_SECRET = value;
              envLoaded = true;
              console.log(`✅ Loaded JWT_SECRET from direct file read: ${envPath}`);
              break;
            }
          }
        }
        if (envLoaded) break;
      }
    } catch (error) {
      // Continue to next path
    }
  }
}

// Verify critical environment variables are loaded
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not found in environment variables. Authentication will fail.');
  console.warn('   Make sure .env file exists in the project root with JWT_SECRET defined.');
  console.warn('   Tried paths:', possibleEnvPaths.join(', '));
} else {
  console.log('✅ JWT_SECRET loaded successfully');
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    // Log incoming requests for debugging
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
      
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] Error handling ${req.method} ${req.url} (${duration}ms):`, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io with enhanced CORS
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  });

  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        socket.userId = decoded.id;
        return next();
      }
    }
    // Allow connection without auth for now (can be made required)
    return next();
  });

  // Socket.io handlers
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id, socket.userId ? `(User: ${socket.userId})` : '(Unauthenticated)');

    // Join olympiad room
    socket.on('join-olympiad', (olympiadId) => {
      socket.join(`olympiad-${olympiadId}`);
      console.log(`User ${socket.id} joined olympiad ${olympiadId}`);
    });

    // Leave olympiad room
    socket.on('leave-olympiad', (olympiadId) => {
      socket.leave(`olympiad-${olympiadId}`);
      console.log(`User ${socket.id} left olympiad ${olympiadId}`);
    });

    // Timer update
    socket.on('timer-update', (data) => {
      socket.to(`olympiad-${data.olympiadId}`).emit('timer-update', data);
    });

    // Leaderboard update
    socket.on('leaderboard-update', (data) => {
      io.to(`olympiad-${data.olympiadId}`).emit('leaderboard-update', data);
    });

    // Submission notification
    socket.on('submission', (data) => {
      socket.to(`olympiad-${data.olympiadId}`).emit('submission-notification', data);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`========================================`);
      console.log(`✅ Backend Server Running!`);
      console.log(`========================================`);
      console.log(`🌐 Server: http://${hostname}:${port}`);
      console.log(`📡 API Base: http://${hostname}:${port}/api`);
      console.log(`🏥 Health: http://${hostname}:${port}/api/health`);
      console.log(`🔌 Socket.io: http://${hostname}:${port}`);
      console.log(`📱 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      
      // Verify critical environment variables
      if (process.env.JWT_SECRET) {
        console.log(`🔐 JWT_SECRET: ✅ Loaded`);
      } else {
        console.log(`🔐 JWT_SECRET: ❌ NOT FOUND - Authentication will fail!`);
        console.log(`   Please ensure .env file exists with JWT_SECRET defined.`);
      }
      
      console.log(`========================================`);
    });
});
