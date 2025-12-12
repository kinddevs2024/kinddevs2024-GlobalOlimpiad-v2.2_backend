import { createOlympiad } from '../lib/olympiad-helper.js';
import { readDB } from '../lib/json-db.js';

// Get first user as creator
const users = readDB('users');
if (users.length === 0) {
  console.error('Error: No users found. Please create a user first.');
  process.exit(1);
}

const creatorId = users[0]._id;
console.log(`Using creator: ${users[0].name} (${users[0].email})`);

// Check if Olympiad already exists
const existingOlympiads = readDB('olympiads');
const existingMathOlympiad = existingOlympiads.find(
  o => o.title.toLowerCase().includes('math') && o.subject === 'Mathematics'
);

if (existingMathOlympiad) {
  console.log('\n✅ Math Olympiad already exists in database!');
  console.log('Olympiad ID:', existingMathOlympiad._id);
  console.log('Title:', existingMathOlympiad.title);
  console.log('Subject:', existingMathOlympiad.subject);
  console.log('Status:', existingMathOlympiad.status);
  console.log('Created At:', existingMathOlympiad.createdAt);
  process.exit(0);
}

// Create new Olympiad
const now = new Date();
const startTime = new Date(now);
startTime.setDate(startTime.getDate() + 1);
const endTime = new Date(startTime);
endTime.setDate(endTime.getDate() + 7);

try {
  const newOlympiad = createOlympiad({
    title: 'Math Olympiad',
    description: 'Mathematics Olympiad competition. This Olympiad contains various mathematical problems and challenges designed to test problem-solving skills and mathematical knowledge. The competition covers topics including algebra, geometry, number theory, and combinatorics.',
    type: 'test',
    subject: 'Mathematics',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: 3600, // 1 hour in seconds
    questions: [],
    totalPoints: 0,
    status: 'unvisible',
    createdBy: creatorId,
    olympiadLogo: null
  });

  console.log('\n✅ Olympiad successfully added to database!');
  console.log('Olympiad ID:', newOlympiad._id);
  console.log('Title:', newOlympiad.title);
  console.log('Subject:', newOlympiad.subject);
  console.log('Type:', newOlympiad.type);
  console.log('Status:', newOlympiad.status);
  console.log('Start Time:', newOlympiad.startTime);
  console.log('End Time:', newOlympiad.endTime);
  console.log('Duration:', newOlympiad.duration, 'seconds (1 hour)');
  console.log('Created By:', creatorId);
  console.log('\nNote: Questions can be added later through the admin interface.');
} catch (error) {
  console.error('Error creating Olympiad:', error.message);
  process.exit(1);
}

