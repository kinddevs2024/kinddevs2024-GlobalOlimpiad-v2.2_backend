import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/olympiad-platform';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

// Cache the connection
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, lastFailure: null, failureCount: 0, lastErrorLog: 0 };
}

// Check if we should skip MongoDB connection (after multiple failures)
const shouldSkipMongoDB = () => {
  if (!cached.lastFailure) return false;
  const timeSinceFailure = Date.now() - cached.lastFailure;
  // Skip for 60 seconds after 3 consecutive failures
  return cached.failureCount >= 3 && timeSinceFailure < 60000;
};

async function connectDB() {
  // Skip if we've had recent failures to avoid unnecessary delays
  if (shouldSkipMongoDB()) {
    const error = new Error('MongoDB connection skipped due to recent failures');
    error.name = 'MongooseServerSelectionError';
    throw error;
  }

  // Return cached connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Create new connection if not cached
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2000, // Reduced from 5000 to 2000ms for faster fallback
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip IPv6
    };

    // Fix localhost to use IPv4 explicitly
    let mongoURI = MONGODB_URI;
    if (mongoURI.includes('localhost') && !mongoURI.includes('127.0.0.1')) {
      mongoURI = mongoURI.replace('localhost', '127.0.0.1');
    }

    mongoose.set('strictQuery', false);
    cached.promise = mongoose.connect(mongoURI, opts)
      .then((mongoose) => {
        console.log('✅ MongoDB Connected:', mongoose.connection.host);
        cached.failureCount = 0; // Reset failure count on success
        cached.lastFailure = null;
        return mongoose;
      })
      .catch((error) => {
        cached.failureCount = (cached.failureCount || 0) + 1;
        const failureTime = Date.now();
        cached.lastFailure = failureTime;
        cached.promise = null;
        // Only log error if it's the first failure or every 5 minutes
        const timeSinceLastLog = failureTime - (cached.lastErrorLog || 0);
        if (cached.failureCount === 1 || timeSinceLastLog > 300000) {
          console.error('❌ MongoDB Connection Error:', error.message);
          cached.lastErrorLog = failureTime;
        }
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
