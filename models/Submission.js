import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  olympiadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Olympiad',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  },
  comment: {
    type: String,
    trim: true
  },
  isAI: {
    type: Boolean,
    default: false
  },
  aiProbability: {
    type: Number,
    default: 0
  },
  aiCheckedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  aiCheckedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
submissionSchema.index({ userId: 1, olympiadId: 1, questionId: 1 });

const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);

export default Submission;

