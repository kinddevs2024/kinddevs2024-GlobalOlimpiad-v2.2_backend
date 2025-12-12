import { readDB, writeDB, generateId } from './json-db.js';

// Read all results
export function getAllResults() {
  return readDB('results');
}

// Find result by ID
export function findResultById(id) {
  const results = readDB('results');
  return results.find((result) => result._id === id);
}

// Find result by user and olympiad
export function findResultByUserAndOlympiad(userId, olympiadId) {
  const results = readDB('results');
  return results.find((result) => 
    result.userId === userId && result.olympiadId === olympiadId
  );
}

// Find all results for an olympiad
export function findResultsByOlympiadId(olympiadId) {
  const results = readDB('results');
  return results.filter((result) => result.olympiadId === olympiadId);
}

// Find all results for a user
export function findResultsByUserId(userId) {
  const results = readDB('results');
  return results.filter((result) => result.userId === userId);
}

// Check if user has already submitted this olympiad in the current month
export function hasSubmittedThisMonth(userId, olympiadId) {
  const results = readDB('results');
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlySubmission = results.find((result) => {
    if (result.userId === userId && result.olympiadId === olympiadId) {
      const completedDate = new Date(result.completedAt);
      const completedMonth = completedDate.getMonth();
      const completedYear = completedDate.getFullYear();
      
      // Check if submission was in the same month and year
      return completedMonth === currentMonth && completedYear === currentYear;
    }
    return false;
  });
  
  return !!monthlySubmission;
}

// Create a new result
export function createResult(resultData) {
  const results = readDB('results');
  
  // Check if result already exists
  const existing = findResultByUserAndOlympiad(resultData.userId, resultData.olympiadId);
  if (existing) {
    throw new Error('Result already exists for this user and olympiad');
  }

  const newResult = {
    _id: generateId(),
    userId: resultData.userId,
    olympiadId: resultData.olympiadId,
    totalScore: resultData.totalScore || 0,
    maxScore: resultData.maxScore || 0,
    percentage: resultData.percentage || 0,
    completedAt: resultData.completedAt || new Date().toISOString(),
    timeSpent: resultData.timeSpent || 0,
    visible: resultData.visible !== undefined ? resultData.visible : true,
    status: resultData.status || 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  results.push(newResult);
  writeDB('results', results);
  
  return newResult;
}

// Update result
export function updateResult(id, updates) {
  const results = readDB('results');
  const resultIndex = results.findIndex((result) => result._id === id);
  
  if (resultIndex === -1) {
    throw new Error('Result not found');
  }

  results[resultIndex] = {
    ...results[resultIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeDB('results', results);
  
  return results[resultIndex];
}

export default {
  getAllResults,
  findResultById,
  findResultByUserAndOlympiad,
  findResultsByOlympiadId,
  findResultsByUserId,
  createResult,
  updateResult,
  hasSubmittedThisMonth,
};

