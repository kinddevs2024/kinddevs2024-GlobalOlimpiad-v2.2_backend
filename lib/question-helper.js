import { readDB, writeDB, generateId } from './json-db.js';
import { findOlympiadById, addQuestionToOlympiad } from './olympiad-helper.js';

// Read all questions
export function getAllQuestions() {
  return readDB('questions');
}

// Find question by ID
export function findQuestionById(id) {
  const questions = readDB('questions');
  return questions.find((question) => question._id === id);
}

// Find questions by olympiad ID
export function findQuestionsByOlympiadId(olympiadId) {
  const questions = readDB('questions');
  return questions.filter((question) => question.olympiadId === olympiadId);
}

// Create a new question
export function createQuestion(questionData) {
  const questions = readDB('questions');
  
  // Verify olympiad exists
  const olympiad = findOlympiadById(questionData.olympiadId);
  if (!olympiad) {
    throw new Error('Olympiad not found');
  }

  // Validate multiple-choice questions
  if (questionData.type === 'multiple-choice') {
    if (!questionData.options || questionData.options.length === 0) {
      throw new Error('Multiple choice questions require options');
    }
    if (!questionData.correctAnswer) {
      throw new Error('Multiple choice questions require correctAnswer');
    }
  }

  // Create new question object
  const newQuestion = {
    _id: generateId(),
    olympiadId: questionData.olympiadId,
    question: questionData.question.trim(),
    type: questionData.type,
    options: questionData.options || [],
    correctAnswer: questionData.correctAnswer || null,
    points: questionData.points || 1,
    order: questionData.order || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add to questions array
  questions.push(newQuestion);
  
  // Save to database
  writeDB('questions', questions);

  // Add question to olympiad
  addQuestionToOlympiad(questionData.olympiadId, newQuestion._id);

  return newQuestion;
}

// Update question
export function updateQuestion(id, updates) {
  const questions = readDB('questions');
  const questionIndex = questions.findIndex((question) => question._id === id);
  
  if (questionIndex === -1) {
    throw new Error('Question not found');
  }

  questions[questionIndex] = {
    ...questions[questionIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeDB('questions', questions);
  
  return questions[questionIndex];
}

// Delete question
export function deleteQuestion(id) {
  const questions = readDB('questions');
  const questionIndex = questions.findIndex((question) => question._id === id);
  
  if (questionIndex === -1) {
    throw new Error('Question not found');
  }

  questions.splice(questionIndex, 1);
  writeDB('questions', questions);
  
  return true;
}

// Get questions with olympiad info
export function getQuestionsWithOlympiad(olympiadId = null) {
  const questions = olympiadId 
    ? findQuestionsByOlympiadId(olympiadId)
    : getAllQuestions();
  
  return questions.map((question) => {
    const olympiad = findOlympiadById(question.olympiadId);
    return {
      ...question,
      olympiad: olympiad ? {
        _id: olympiad._id,
        title: olympiad.title,
        olympiadLogo: olympiad.olympiadLogo || null,
      } : null,
    };
  });
}

export default {
  getAllQuestions,
  findQuestionById,
  findQuestionsByOlympiadId,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionsWithOlympiad,
};

