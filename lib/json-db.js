import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file paths
const DB_FILES = {
  users: path.join(dataDir, 'users.json'),
  olympiads: path.join(dataDir, 'olympiads.json'),
  questions: path.join(dataDir, 'questions.json'),
  results: path.join(dataDir, 'results.json'),
  submissions: path.join(dataDir, 'submissions.json'),
  cameraCaptures: path.join(dataDir, 'camera-captures.json'),
  drafts: path.join(dataDir, 'drafts.json'),
};

// Initialize database files with empty arrays if they don't exist
function initDB() {
  Object.keys(DB_FILES).forEach((key) => {
    if (!fs.existsSync(DB_FILES[key])) {
      fs.writeFileSync(DB_FILES[key], JSON.stringify([], null, 2));
    }
  });
}

// Read data from a database file
export function readDB(table) {
  initDB();
  try {
    const data = fs.readFileSync(DB_FILES[table], 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${table} database:`, error);
    return [];
  }
}

// Write data to a database file
export function writeDB(table, data) {
  initDB();
  try {
    fs.writeFileSync(DB_FILES[table], JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to ${table} database:`, error);
    return false;
  }
}

// Generate a simple ID (timestamp + random)
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Connect to database (for compatibility with existing code)
export async function connectDB() {
  initDB();
  return true;
}

export default { readDB, writeDB, generateId, connectDB };

