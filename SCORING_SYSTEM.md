# Olympiad Scoring System

This document describes the scoring system implemented for the Olympiad platform, supporting both test-based and text-based (essay) Olympiads.

## Overview

The system supports two types of Olympiads:
1. **Test-based Olympiads**: Multiple-choice questions with automatic scoring
2. **Text-based (Essay) Olympiads**: Free-form text answers with automatic originality and AI-detection scoring

## Test-Based Scoring

### How It Works
- When a user submits answers for a test-type Olympiad, the system:
  1. Compares each submitted answer with the correct answer stored in the database
  2. Awards full points if the answer is correct, 0 points if incorrect
  3. Calculates total score by summing all question scores
  4. Calculates percentage: `(totalScore / maxScore) * 100`

### Implementation
- Location: `pages/api/olympiads/[id]/submit.js` (lines 243-272)
- Logic: Direct comparison of user answer with `question.correctAnswer`
- Points: Awarded based on `question.points` value

## Text-Based (Essay) Scoring

### How It Works
The system uses Natural Language Processing (NLP) and Machine Learning techniques to automatically score essays based on:

1. **Originality (40% weight)**
   - Compares the essay with other submissions using Jaccard similarity
   - Higher uniqueness = higher originality score

2. **Text Complexity (30% weight)**
   - Analyzes vocabulary richness
   - Considers word count, sentence structure, and vocabulary diversity

3. **AI-Generated Content Detection (20% weight)**
   - Detects patterns typical of AI-generated text:
     - Excessive formal transition phrases
     - Lack of personal language
     - Uniform sentence structure
     - Generic phrases
   - Penalizes AI-generated content

4. **Repetition Detection (10% weight)**
   - Identifies repetitive word usage
   - Penalizes low originality due to repetition

### Scoring Formula
```
Final Score = (Originality × 40) + (Complexity × 30) + (20 - AI_Penalty) + (10 - Repetition_Penalty)
```

The score is then converted to points: `(Final Score / 100) × maxPoints`

### Implementation
- Text Analysis Service: `lib/text-analysis.js`
- Integration: `pages/api/olympiads/[id]/submit.js` (lines 280-310)

## Leaderboard

### Endpoint
`GET /api/olympiads/:id/leaderboard`

### Features
- Displays all participants ranked by score (descending)
- Shows rankings: 1st, 2nd, 3rd place with emojis
- Includes:
  - Rank and position
  - User name and email
  - Score and total points
  - Percentage
  - Completion time
- Provides `topThree` array for easy access to winners

### Ranking Logic
1. Primary: Total score (higher is better)
2. Secondary: Completion time (faster is better for tie-breaking)

## Results Display

### Endpoint
`GET /api/olympiads/:id/results`

### For Test-Based Olympiads
- Shows user's score, total points, and percentage
- Displays rank and total participants
- Includes submitted answers and correct answers
- Shows submission details (score per question, correctness)

### For Essay-Based Olympiads
- Includes all test-based features
- Additionally provides `essayAnalysis` object with:
  - Originality score
  - AI probability
  - Complexity metrics (word count, sentence count, vocabulary richness)
  - Repetition score
  - Analysis indicators

## API Endpoints

### Submit Answers
**POST** `/api/olympiads/:id/submit`

**Request Body (Test):**
```json
{
  "answers": {
    "question_id_1": "option_a",
    "question_id_2": "option_b"
  }
}
```

**Request Body (Essay):**
```json
{
  "essay": "Essay content here..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Submission successful",
  "submissionId": "...",
  "score": 85,
  "totalPoints": 100,
  "percentage": 85
}
```

### Get Leaderboard
**GET** `/api/olympiads/:id/leaderboard`

**Response:**
```json
{
  "success": true,
  "olympiadId": "...",
  "olympiadTitle": "...",
  "olympiadType": "test",
  "totalParticipants": 10,
  "leaderboard": [
    {
      "rank": 1,
      "position": "🥇 1st Place",
      "userId": "...",
      "userName": "John Doe",
      "score": 95,
      "totalPoints": 100,
      "percentage": 95
    }
  ],
  "topThree": [...]
}
```

### Get Results
**GET** `/api/olympiads/:id/results`

**Response (Test):**
```json
{
  "success": true,
  "olympiadId": "...",
  "score": 85,
  "totalPoints": 100,
  "percentage": 85,
  "rank": 3,
  "totalParticipants": 10,
  "answers": {...},
  "correctAnswers": {...},
  "submissionDetails": {...}
}
```

**Response (Essay):**
```json
{
  "success": true,
  "olympiadId": "...",
  "score": 75,
  "totalPoints": 100,
  "percentage": 75,
  "rank": 5,
  "essayAnalysis": {
    "originality": 0.85,
    "aiProbability": 0.15,
    "complexity": {...},
    "repetition": 0.1,
    "score": 75,
    "wordCount": 250,
    "sentenceCount": 12
  }
}
```

## Text Analysis Features

The text analysis service (`lib/text-analysis.js`) provides:

1. **Complexity Analysis**
   - Word count
   - Sentence count
   - Average words per sentence
   - Average word length
   - Unique words count
   - Vocabulary richness

2. **Repetition Detection**
   - Identifies frequently repeated words
   - Calculates repetition score

3. **AI Pattern Detection**
   - Detects formal language patterns
   - Identifies uniform sentence structures
   - Flags generic phrases
   - Checks for personal language

4. **Originality Comparison**
   - Compares with other submissions
   - Uses Jaccard similarity for comparison
   - Calculates uniqueness score

## Future Enhancements

For production use, consider:
- Integrating spaCy for advanced NLP features
- Using pre-trained ML models for better AI detection
- Adding semantic similarity analysis
- Implementing plagiarism detection against external sources
- Adding manual grading override for essays
- Supporting partial credit for test questions
- Adding time-based scoring bonuses

## Notes

- The current implementation uses lightweight NLP techniques that don't require external dependencies
- For production, consider integrating spaCy or other NLP libraries for more accurate analysis
- Essay scoring is automatic but can be manually adjusted if needed
- All scores are stored in the database and can be recalculated if needed

