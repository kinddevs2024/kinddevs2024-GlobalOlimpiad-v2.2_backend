import pdf from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDB, writeDB, generateId } from '../lib/json-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const pdfPath = path.join(rootDir, 'data', 'matholimpiad.pdf');

async function addMathOlympiad() {
  try {
    console.log('Reading PDF file...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    console.log(`PDF parsed: ${pdfData.numpages} pages, ${pdfData.text.length} characters`);
    
    // Get first user as creator
    const users = readDB('users');
    if (users.length === 0) {
      throw new Error('No users found. Please create a user first.');
    }
    const creatorId = users[0]._id;
    console.log(`Using creator: ${users[0].name} (${users[0].email})`);
    
    // Extract information from PDF
    const title = pdfData.info?.Title || 'Math Olympiad';
    const textPreview = pdfData.text.substring(0, 500).replace(/\s+/g, ' ').trim();
    const description = `Mathematics Olympiad competition. ${textPreview}...`;
    
    // Set dates
    const now = new Date();
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() + 1);
    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 7);
    const duration = 3600; // 1 hour in seconds
    
    // Create Olympiad using the helper pattern
    const olympiads = readDB('olympiads');
    
    const newOlympiad = {
      _id: generateId(),
      title: title,
      description: description,
      type: 'test',
      subject: 'Mathematics',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: duration,
      questions: [],
      totalPoints: 0,
      status: 'unvisible',
      createdBy: creatorId,
      olympiadLogo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    olympiads.push(newOlympiad);
    writeDB('olympiads', olympiads);
    
    console.log('\n✅ Olympiad created successfully!');
    console.log('Olympiad ID:', newOlympiad._id);
    console.log('Title:', newOlympiad.title);
    console.log('Subject:', newOlympiad.subject);
    console.log('Status:', newOlympiad.status);
    console.log('Start Time:', newOlympiad.startTime);
    console.log('End Time:', newOlympiad.endTime);
    console.log('Duration:', duration, 'seconds (1 hour)');
    
    // Save PDF text for reference
    const pdfTextPath = path.join(rootDir, 'data', 'matholimpiad-text.txt');
    fs.writeFileSync(pdfTextPath, pdfData.text, 'utf8');
    console.log('\nPDF text saved to: data/matholimpiad-text.txt');
    console.log('\nNote: Questions can be added later through the admin interface.');
    
    return newOlympiad;
  } catch (error) {
    console.error('Error creating Olympiad:', error);
    process.exit(1);
  }
}

addMathOlympiad();

