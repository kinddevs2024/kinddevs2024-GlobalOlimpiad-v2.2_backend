import { readDB, writeDB, generateId } from './json-db.js';

// Read all submissions
export function getAllSubmissions() {
  return readDB('submissions');
}

// Find submission by ID
export function findSubmissionById(id) {
  const submissions = readDB('submissions');
  return submissions.find((submission) => submission._id === id);
}

// Find submissions by user and olympiad
export function findSubmissionsByUserAndOlympiad(userId, olympiadId) {
  const submissions = readDB('submissions');
  return submissions.filter((submission) => 
    submission.userId === userId && submission.olympiadId === olympiadId
  );
}

// Find all submissions for an olympiad
export function findSubmissionsByOlympiadId(olympiadId) {
  const submissions = readDB('submissions');
  return submissions.filter((submission) => submission.olympiadId === olympiadId);
}

// Find all submissions for a user
export function findSubmissionsByUserId(userId) {
  const submissions = readDB('submissions');
  return submissions.filter((submission) => submission.userId === userId);
}

// Create a new submission
export function createSubmission(submissionData) {
  const submissions = readDB('submissions');

  const newSubmission = {
    _id: generateId(),
    userId: submissionData.userId,
    olympiadId: submissionData.olympiadId,
    questionId: submissionData.questionId,
    answer: submissionData.answer,
    score: submissionData.score || 0,
    isCorrect: submissionData.isCorrect || false,
    gradedBy: submissionData.gradedBy || null,
    gradedAt: submissionData.gradedAt || null,
    comment: submissionData.comment || null,
    isAI: submissionData.isAI || false,
    aiProbability: submissionData.aiProbability || 0,
    aiCheckedBy: submissionData.aiCheckedBy || null,
    aiCheckedAt: submissionData.aiCheckedAt || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  submissions.push(newSubmission);
  writeDB('submissions', submissions);
  
  return newSubmission;
}

// Update submission
export function updateSubmission(id, updates) {
  const submissions = readDB('submissions');
  const submissionIndex = submissions.findIndex((submission) => submission._id === id);
  
  if (submissionIndex === -1) {
    throw new Error('Submission not found');
  }

  submissions[submissionIndex] = {
    ...submissions[submissionIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeDB('submissions', submissions);
  
  return submissions[submissionIndex];
}

export default {
  getAllSubmissions,
  findSubmissionById,
  findSubmissionsByUserAndOlympiad,
  findSubmissionsByOlympiadId,
  findSubmissionsByUserId,
  createSubmission,
  updateSubmission,
};

