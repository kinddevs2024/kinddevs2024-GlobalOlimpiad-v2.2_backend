import { readDB, writeDB, generateId } from './json-db.js';
import { findUserById } from './user-helper.js';

// Read all olympiads
export function getAllOlympiads() {
  return readDB('olympiads');
}

// Find olympiad by ID
export function findOlympiadById(id) {
  const olympiads = readDB('olympiads');
  return olympiads.find((olympiad) => olympiad._id === id);
}

// Find olympiads by status
export function findOlympiadsByStatus(status) {
  const olympiads = readDB('olympiads');
  if (Array.isArray(status)) {
    return olympiads.filter((olympiad) => status.includes(olympiad.status));
  }
  return olympiads.filter((olympiad) => olympiad.status === status);
}

// Find olympiads by creator
export function findOlympiadsByCreator(userId) {
  const olympiads = readDB('olympiads');
  return olympiads.filter((olympiad) => olympiad.createdBy === userId);
}

// Create a new olympiad
export function createOlympiad(olympiadData) {
  const olympiads = readDB('olympiads');
  
  // Verify creator exists
  const creator = findUserById(olympiadData.createdBy);
  if (!creator) {
    throw new Error('Creator user not found');
  }

  // Create new olympiad object
  const newOlympiad = {
    _id: generateId(),
    title: olympiadData.title.trim(),
    description: olympiadData.description.trim(),
    type: olympiadData.type || 'test',
    subject: olympiadData.subject.trim(),
    startTime: new Date(olympiadData.startTime).toISOString(),
    endTime: new Date(olympiadData.endTime).toISOString(),
    duration: olympiadData.duration,
    questions: olympiadData.questions || [],
    totalPoints: olympiadData.totalPoints || 0,
    status: olympiadData.status || 'unvisible', // Default to unvisible (draft)
    createdBy: olympiadData.createdBy,
    olympiadLogo: olympiadData.olympiadLogo?.trim() || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add to olympiads array
  olympiads.push(newOlympiad);
  
  // Save to database
  writeDB('olympiads', olympiads);

  return newOlympiad;
}

// Update olympiad
export function updateOlympiad(id, updates) {
  const olympiads = readDB('olympiads');
  const olympiadIndex = olympiads.findIndex((olympiad) => olympiad._id === id);
  
  if (olympiadIndex === -1) {
    throw new Error('Olympiad not found');
  }

  // Update fields
  const updatedOlympiad = {
    ...olympiads[olympiadIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Handle date fields
  if (updates.startTime) {
    updatedOlympiad.startTime = new Date(updates.startTime).toISOString();
  }
  if (updates.endTime) {
    updatedOlympiad.endTime = new Date(updates.endTime).toISOString();
  }

  olympiads[olympiadIndex] = updatedOlympiad;
  writeDB('olympiads', olympiads);
  
  return updatedOlympiad;
}

// Delete olympiad
export function deleteOlympiad(id) {
  const olympiads = readDB('olympiads');
  const olympiadIndex = olympiads.findIndex((olympiad) => olympiad._id === id);
  
  if (olympiadIndex === -1) {
    throw new Error('Olympiad not found');
  }

  olympiads.splice(olympiadIndex, 1);
  writeDB('olympiads', olympiads);
  
  return true;
}

// Add question to olympiad
export function addQuestionToOlympiad(olympiadId, questionId) {
  const olympiad = findOlympiadById(olympiadId);
  if (!olympiad) {
    throw new Error('Olympiad not found');
  }

  if (!olympiad.questions.includes(questionId)) {
    olympiad.questions.push(questionId);
    updateOlympiad(olympiadId, { questions: olympiad.questions });
  }

  return olympiad;
}

// Recalculate total points for an olympiad (async version)
export async function recalculateOlympiadPoints(olympiadId) {
  const olympiad = findOlympiadById(olympiadId);
  if (!olympiad) {
    throw new Error('Olympiad not found');
  }

  // Dynamic import to avoid circular dependency
  const { getAllQuestions } = await import('./question-helper.js');
  const allQuestions = getAllQuestions();
  const olympiadQuestions = allQuestions.filter(q => olympiad.questions.includes(q._id));
  const totalPoints = olympiadQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
  
  updateOlympiad(olympiadId, { totalPoints });
  return totalPoints;
}

// Get olympiad with populated creator
export function getOlympiadWithCreator(id) {
  const olympiad = findOlympiadById(id);
  if (!olympiad) {
    return null;
  }

  const creator = findUserById(olympiad.createdBy);
  return {
    ...olympiad,
    createdBy: creator ? {
      _id: creator._id,
      name: creator.name,
      email: creator.email,
    } : null,
  };
}

// Get all olympiads with populated creators
export function getAllOlympiadsWithCreators() {
  const olympiads = getAllOlympiads();
  return olympiads.map((olympiad) => {
    const creator = findUserById(olympiad.createdBy);
    return {
      ...olympiad,
      createdBy: creator ? {
        _id: creator._id,
        name: creator.name,
        email: creator.email,
      } : null,
    };
  });
}

export default {
  getAllOlympiads,
  findOlympiadById,
  findOlympiadsByStatus,
  findOlympiadsByCreator,
  createOlympiad,
  updateOlympiad,
  deleteOlympiad,
  addQuestionToOlympiad,
  getOlympiadWithCreator,
  getAllOlympiadsWithCreators,
};

