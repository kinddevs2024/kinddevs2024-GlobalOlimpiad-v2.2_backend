/**
 * Text Analysis Service
 * Uses NLP and ML techniques to analyze text for originality and detect AI-generated content
 */

// Simple text analysis without external dependencies
// For production, you would use spaCy and ML models

/**
 * Calculate text complexity metrics
 */
function calculateComplexity(text) {
  if (!text || text.trim().length === 0) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      avgWordsPerSentence: 0,
      avgWordLength: 0,
      uniqueWords: 0,
      vocabularyRichness: 0,
    };
  }

  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^\w]/g, '')));
  
  const avgWordLength = words.length > 0
    ? words.reduce((sum, w) => sum + w.length, 0) / words.length
    : 0;

  return {
    wordCount: words.length,
    sentenceCount: sentences.length || 1,
    avgWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : words.length,
    avgWordLength,
    uniqueWords: uniqueWords.size,
    vocabularyRichness: words.length > 0 ? uniqueWords.size / words.length : 0,
  };
}

/**
 * Detect repetitive patterns (indicator of low originality)
 */
function detectRepetition(text) {
  if (!text || text.trim().length === 0) return 0;

  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wordFreq = {};
  
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Calculate repetition score (higher = more repetitive)
  const maxFreq = Math.max(...Object.values(wordFreq));
  const totalWords = words.length;
  const repetitionScore = totalWords > 0 ? maxFreq / totalWords : 0;

  return Math.min(repetitionScore, 1);
}

/**
 * Check for common AI-generated text patterns
 */
function detectAIPatterns(text) {
  if (!text || text.trim().length === 0) return { score: 0, indicators: [] };

  const indicators = [];
  let aiScore = 0;

  // Pattern 1: Overly formal or structured language
  const formalPhrases = [
    'in conclusion', 'furthermore', 'moreover', 'additionally',
    'it is important to note', 'it should be noted', 'it is worth mentioning',
    'in order to', 'with regard to', 'in terms of'
  ];
  
  const formalCount = formalPhrases.filter(phrase => 
    text.toLowerCase().includes(phrase)
  ).length;
  
  if (formalCount > 2) {
    indicators.push('Excessive use of formal transition phrases');
    aiScore += 0.2;
  }

  // Pattern 2: Perfect grammar and punctuation (AI tends to be too perfect)
  // This is harder to detect without NLP, so we'll use simpler heuristics

  // Pattern 3: Lack of personal pronouns or informal language
  const personalPronouns = ['i', 'me', 'my', 'we', 'our', 'us'];
  const hasPersonalPronouns = personalPronouns.some(pronoun => 
    text.toLowerCase().includes(pronoun)
  );
  
  if (!hasPersonalPronouns && text.split(/\s+/).length > 50) {
    indicators.push('Lack of personal language');
    aiScore += 0.15;
  }

  // Pattern 4: Very uniform sentence length (AI tends to create uniform sentences)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 5) {
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => 
      sum + Math.pow(len - avgLength, 2), 0
    ) / sentenceLengths.length;
    const stdDev = Math.sqrt(variance);
    
    // Low variance in sentence length might indicate AI
    if (stdDev < avgLength * 0.3) {
      indicators.push('Uniform sentence structure');
      aiScore += 0.1;
    }
  }

  // Pattern 5: Too many filler words or generic phrases
  const genericPhrases = [
    'it is clear that', 'it can be seen that', 'it is evident that',
    'one can observe', 'it is apparent that'
  ];
  
  const genericCount = genericPhrases.filter(phrase => 
    text.toLowerCase().includes(phrase)
  ).length;
  
  if (genericCount > 1) {
    indicators.push('Use of generic phrases');
    aiScore += 0.15;
  }

  return {
    score: Math.min(aiScore, 1),
    indicators,
  };
}

/**
 * Calculate originality score by comparing with other submissions
 */
function calculateOriginalityScore(text, otherSubmissions = []) {
  if (!text || text.trim().length === 0) return 0;

  if (otherSubmissions.length === 0) {
    // If no other submissions, assume high originality
    return 0.8;
  }

  const textWords = new Set(
    text.toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^\w]/g, ''))
      .filter(w => w.length > 2)
  );

  let maxSimilarity = 0;

  otherSubmissions.forEach(submission => {
    if (!submission.answer || typeof submission.answer !== 'string') return;

    const otherWords = new Set(
      submission.answer.toLowerCase()
        .split(/\s+/)
        .map(w => w.replace(/[^\w]/g, ''))
        .filter(w => w.length > 2)
    );

    // Calculate Jaccard similarity
    const intersection = new Set([...textWords].filter(w => otherWords.has(w)));
    const union = new Set([...textWords, ...otherWords]);
    
    const similarity = union.size > 0 ? intersection.size / union.size : 0;
    maxSimilarity = Math.max(maxSimilarity, similarity);
  });

  // Originality is inverse of similarity
  return Math.max(0, 1 - maxSimilarity);
}

/**
 * Main function to analyze text for originality and AI detection
 * @param {string} text - The text to analyze
 * @param {Array} otherSubmissions - Other submissions for comparison (optional)
 * @returns {Object} Analysis results
 */
export function analyzeText(text, otherSubmissions = []) {
  if (!text || typeof text !== 'string') {
    return {
      originality: 0,
      aiProbability: 0,
      complexity: calculateComplexity(''),
      repetition: 0,
      score: 0,
      indicators: [],
      error: 'Invalid text input',
    };
  }

  const trimmedText = text.trim();
  
  if (trimmedText.length === 0) {
    return {
      originality: 0,
      aiProbability: 0,
      complexity: calculateComplexity(''),
      repetition: 0,
      score: 0,
      indicators: ['Empty text'],
      error: 'Text is empty',
    };
  }

  // Calculate metrics
  const complexity = calculateComplexity(trimmedText);
  const repetition = detectRepetition(trimmedText);
  const aiDetection = detectAIPatterns(trimmedText);
  const originality = calculateOriginalityScore(trimmedText, otherSubmissions);

  // Calculate overall score (0-100)
  // Originality: 40%, Complexity: 30%, AI Detection (inverse): 20%, Repetition (inverse): 10%
  const originalityScore = originality * 40;
  const complexityScore = Math.min(complexity.vocabularyRichness * 30, 30);
  const aiPenalty = aiDetection.score * 20; // Penalize AI-generated content
  const repetitionPenalty = repetition * 10; // Penalize repetition
  
  const finalScore = Math.max(0, Math.min(100, 
    originalityScore + 
    complexityScore + 
    (20 - aiPenalty) + 
    (10 - repetitionPenalty)
  ));

  return {
    originality: Math.round(originality * 100) / 100,
    aiProbability: Math.round(aiDetection.score * 100) / 100,
    complexity,
    repetition: Math.round(repetition * 100) / 100,
    score: Math.round(finalScore),
    indicators: aiDetection.indicators,
    wordCount: complexity.wordCount,
    sentenceCount: complexity.sentenceCount,
  };
}

/**
 * Score essay based on analysis
 * @param {string} text - The essay text
 * @param {number} maxPoints - Maximum points for this question
 * @param {Array} otherSubmissions - Other submissions for comparison
 * @returns {Object} Scoring result
 */
export function scoreEssay(text, maxPoints = 10, otherSubmissions = []) {
  const analysis = analyzeText(text, otherSubmissions);
  
  // Convert analysis score (0-100) to points (0-maxPoints)
  const points = Math.round((analysis.score / 100) * maxPoints);
  
  return {
    score: points,
    maxPoints,
    analysis,
    percentage: Math.round((points / maxPoints) * 100),
  };
}

export default {
  analyzeText,
  scoreEssay,
  calculateComplexity,
  detectRepetition,
  detectAIPatterns,
  calculateOriginalityScore,
};

