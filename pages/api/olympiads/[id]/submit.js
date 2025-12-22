import { connectDB, readDB, writeDB } from '../../../../lib/json-db.js';
import { findOlympiadById } from '../../../../lib/olympiad-helper.js';
import { getAllQuestions, findQuestionsByOlympiadId } from '../../../../lib/question-helper.js';
import { createSubmission, findSubmissionsByUserAndOlympiad, findSubmissionsByOlympiadId } from '../../../../lib/submission-helper.js';
import { createResult, findResultByUserAndOlympiad, hasSubmittedThisMonth } from '../../../../lib/result-helper.js';
import { deleteDraft } from '../../../../lib/draft-helper.js';
import { protect } from '../../../../lib/auth.js';
import { scoreEssay } from '../../../../lib/text-analysis.js';

/**
 * @swagger
 * /olympiads/{id}/submit:
 *   post:
 *     summary: Submit olympiad answers
 *     tags: [Olympiads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Olympiad ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               answers:
     *                 type: object
     *                 description: Answers object. For test type: questionId: selectedOption. For essay type: questionId: essayContent. For mixed type: questionId: answer (can be option or essay content depending on question type)
     *                 example:
     *                   question_id_1: "option_a"
     *                   question_id_2: "option_b"
     *                   question_id_3: "Essay content here..."
     *               essay:
     *                 type: string
     *                 description: Essay content for essay type olympiad (alternative format)
 *     responses:
 *       200:
 *         description: Submission successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Submission successful
 *                 submissionId:
 *                   type: string
 *       400:
 *         description: Bad request or already submitted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Olympiad not found
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authResult = await protect(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ 
        success: false,
        message: authResult.error 
      });
    }

    await connectDB();

    const { answers, essay, content, answer } = req.body || {};
    const { id: olympiadId } = req.query;
    const userId = authResult.user._id;

    // Validate request body
    if (!req.body || (typeof req.body !== 'object')) {
      return res.status(400).json({ 
        success: false,
        message: 'Request body is required and must be JSON' 
      });
    }

    // Check if olympiad exists
    const olympiad = findOlympiadById(olympiadId);
    if (!olympiad) {
      return res.status(404).json({ 
        success: false,
        message: 'Olympiad not found' 
      });
    }

    // Check if olympiad is in a valid status for submission
    const validSubmissionStatuses = ['active', 'published'];
    if (!validSubmissionStatuses.includes(olympiad.status)) {
      return res.status(400).json({ 
        success: false,
        message: `Cannot submit. Olympiad status is: ${olympiad.status}. It must be 'active' or 'published' to submit.` 
      });
    }

    // Check if olympiad is within the time window
    const now = new Date();
    const startTime = new Date(olympiad.startTime);
    const endTime = new Date(olympiad.endTime);

    if (now < startTime) {
      return res.status(400).json({ 
        success: false,
        message: `Cannot submit. Olympiad has not started yet. Start time: ${startTime.toISOString()}` 
      });
    }

    if (now > endTime) {
      return res.status(400).json({ 
        success: false,
        message: `Cannot submit. Olympiad has ended. End time: ${endTime.toISOString()}` 
      });
    }

    // Check if user has already submitted this olympiad this month
    if (hasSubmittedThisMonth(userId, olympiadId)) {
      const existingResult = findResultByUserAndOlympiad(userId, olympiadId);
      const completedDate = existingResult ? new Date(existingResult.completedAt) : new Date();
      const nextMonth = new Date(completedDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1); // First day of next month
      
      return res.status(400).json({ 
        success: false,
        message: 'You have already taken this olympiad this month. You can take it again next month.',
        submittedAt: existingResult?.completedAt,
        nextAvailableDate: nextMonth.toISOString(),
        canResubmit: false,
        reason: 'Monthly limit reached'
      });
    }

    // Check if already submitted (for resubmission logic)
    const existingResult = findResultByUserAndOlympiad(userId, olympiadId);
    if (existingResult) {
      // Allow resubmission if olympiad is still active and within time window
      const allowResubmission = validSubmissionStatuses.includes(olympiad.status) && 
                                now >= startTime && 
                                now <= endTime;
      
      if (allowResubmission) {
        // Delete existing result and submissions to allow resubmission
        // Remove existing result
        const results = readDB('results');
        const resultIndex = results.findIndex(r => r._id === existingResult._id);
        if (resultIndex !== -1) {
          results.splice(resultIndex, 1);
          writeDB('results', results);
        }
        
        // Remove existing submissions
        const submissions = readDB('submissions');
        const filteredSubmissions = submissions.filter(
          s => !(s.userId === userId && s.olympiadId === olympiadId)
        );
        writeDB('submissions', filteredSubmissions);
        
        // Continue with submission process
      } else {
        return res.status(400).json({ 
          success: false,
          message: 'Already submitted',
          submittedAt: existingResult.completedAt,
          score: existingResult.totalScore,
          maxScore: existingResult.maxScore,
          percentage: existingResult.percentage,
          canResubmit: false,
          reason: olympiad.status !== 'active' && olympiad.status !== 'published' 
            ? 'Olympiad is no longer active' 
            : now > endTime 
            ? 'Olympiad has ended' 
            : 'Resubmission not allowed'
        });
      }
    }

    // Get all questions for this olympiad
    const allQuestions = findQuestionsByOlympiadId(olympiadId);
    
    if (!allQuestions || allQuestions.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No questions found for this olympiad' 
      });
    }

    // Validate required data based on olympiad type
    let essayContent = null;
    
    if (olympiad.type === 'test') {
      if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Answers are required for test type olympiad. Please provide answers object with questionId: answer pairs.' 
        });
      }
    } else if (olympiad.type === 'mixed') {
      // Mixed type - must have answers object with both test and essay questions
      if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Answers are required for mixed type olympiad. Please provide answers object with questionId: answer pairs (for test questions) or questionId: essayContent (for essay questions).' 
        });
      }
      
      // Validate that all questions have answers
      const answeredQuestionIds = Object.keys(answers);
      const questionIds = allQuestions.map(q => q._id);
      const missingAnswers = questionIds.filter(qId => !answeredQuestionIds.includes(qId));
      
      if (missingAnswers.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: `Missing answers for questions: ${missingAnswers.join(', ')}. Please provide answers for all questions.`,
          missingQuestions: missingAnswers
        });
      }
    } else if (olympiad.type === 'essay') {
      // Support multiple field names for essay content
      // Also check if answers is a string (some frontends send essay in answers field)
      if (typeof answers === 'string' && answers.trim().length > 0) {
        essayContent = answers;
      } else if (typeof essay === 'string' && essay.trim().length > 0) {
        essayContent = essay;
      } else if (typeof content === 'string' && content.trim().length > 0) {
        essayContent = content;
      } else if (typeof answer === 'string' && answer.trim().length > 0) {
        essayContent = answer;
      } else if (answers && typeof answers === 'object' && answers !== null) {
        // Check if answers object contains essay content
        // Try common keys first
        if (answers.essay && typeof answers.essay === 'string' && answers.essay.trim().length > 0) {
          essayContent = answers.essay;
        } else if (answers.content && typeof answers.content === 'string' && answers.content.trim().length > 0) {
          essayContent = answers.content;
        } else if (answers.answer && typeof answers.answer === 'string' && answers.answer.trim().length > 0) {
          essayContent = answers.answer;
        } else {
          // Check all values in the object for a non-empty string
          const values = Object.values(answers);
          for (const value of values) {
            if (typeof value === 'string' && value.trim().length > 0) {
              essayContent = value;
              break;
            }
          }
        }
      }
      
      if (!essayContent || essayContent.trim().length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Essay content is required for essay type olympiad. Please provide the essay content in the "essay", "content", "answer", or "answers" field (as a string).',
          receivedFields: Object.keys(req.body || {}),
          bodyType: typeof req.body,
          answersType: typeof answers,
          answersValue: answers,
          hint: 'For essay type olympiads, send: { "essay": "your content" } or { "answers": "your content" } or { "answers": { "essay": "your content" } }'
        });
      }
    } else {
      return res.status(400).json({ 
        success: false,
        message: `Unknown olympiad type: ${olympiad.type}` 
      });
    }
    
    // Process submissions
    const submissions = [];
    let totalScore = 0;

    if (olympiad.type === 'test' && answers) {
      // Test type - process answers
      for (const [questionId, answer] of Object.entries(answers)) {
        const question = allQuestions.find((q) => q._id === questionId);
        if (!question) {
          continue;
        }

        let score = 0;
        let isCorrect = false;

        if (question.type === 'multiple-choice') {
          isCorrect = question.correctAnswer === answer;
          score = isCorrect ? question.points : 0;
        }

        totalScore += score;

        const submission = createSubmission({
          userId,
          olympiadId,
          questionId,
          answer,
          score,
          isCorrect,
        });

        submissions.push(submission);
      }

      if (submissions.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'No valid answers provided. Please check that your question IDs match the olympiad questions.' 
        });
      }
    } else if (olympiad.type === 'mixed' && answers) {
      // Mixed type - process both test and essay questions
      // Get other submissions for essay originality comparison
      const otherSubmissions = findSubmissionsByOlympiadId(olympiadId)
        .filter(s => s.userId !== userId);
      
      for (const [questionId, answerValue] of Object.entries(answers)) {
        const question = allQuestions.find((q) => q._id === questionId);
        if (!question) {
          continue;
        }

        let score = 0;
        let isCorrect = false;
        let submissionAnswer = answerValue;

        if (question.type === 'multiple-choice') {
          // Test question - compare with correct answer
          isCorrect = question.correctAnswer === answerValue;
          score = isCorrect ? question.points : 0;
          submissionAnswer = answerValue; // Store the selected option
        } else if (question.type === 'essay') {
          // Essay question - analyze and score text
          if (typeof answerValue !== 'string' || answerValue.trim().length === 0) {
            console.warn(`Empty essay answer for question ${questionId}, scoring 0`);
            score = 0;
            isCorrect = false;
            submissionAnswer = answerValue || '';
          } else {
            // Score the essay using text analysis
            const essayScoring = scoreEssay(
              answerValue.trim(),
              question.points || 10,
              otherSubmissions.filter(s => s.questionId === questionId)
            );
            
            score = essayScoring.score;
            isCorrect = essayScoring.score > 0;
            submissionAnswer = answerValue.trim();

          }
        }

        totalScore += score;

        const submission = createSubmission({
          userId,
          olympiadId,
          questionId,
          answer: submissionAnswer,
          score,
          isCorrect,
        });

        submissions.push(submission);
      }

      if (submissions.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'No valid answers provided. Please check that your question IDs match the olympiad questions.' 
        });
      }
    } else if (olympiad.type === 'essay' && essayContent) {
      // Essay type - analyze and score text automatically
      const question = allQuestions[0]; // Essay olympiads typically have one question
      if (question) {
        // Get other submissions for this olympiad to compare originality
        const otherSubmissions = findSubmissionsByOlympiadId(olympiadId)
          .filter(s => s.userId !== userId); // Exclude current user's submissions
        
        // Score the essay using text analysis
        const essayScoring = scoreEssay(
          essayContent.trim(),
          question.points || 10,
          otherSubmissions
        );

        const submission = createSubmission({
          userId,
          olympiadId,
          questionId: question._id,
          answer: essayContent.trim(),
          score: essayScoring.score,
          isCorrect: essayScoring.score > 0, // Consider correct if score > 0
        });
        
        submissions.push(submission);
        totalScore = essayScoring.score; // Set total score for essay

      } else {
        return res.status(400).json({ 
          success: false,
          message: 'No question found for essay submission' 
        });
      }
    }

    // Calculate percentage
    const percentage = olympiad.totalPoints > 0 
      ? (totalScore / olympiad.totalPoints) * 100 
      : 0;

    // Create result
    const result = createResult({
      userId,
      olympiadId,
      totalScore,
      maxScore: olympiad.totalPoints,
      percentage: Math.round(percentage * 100) / 100,
      completedAt: new Date().toISOString(),
    });

    // Delete draft after successful submission
    try {
      deleteDraft(userId, olympiadId);
    } catch (error) {
      console.warn('Failed to delete draft after submission:', error);
      // Don't fail the submission if draft deletion fails
    }

    res.json({
      success: true,
      message: 'Submission successful',
      submissionId: result._id,
      score: totalScore,
      totalPoints: olympiad.totalPoints,
      percentage: result.percentage,
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to submit olympiad. Please try again."
    });
  }
}
