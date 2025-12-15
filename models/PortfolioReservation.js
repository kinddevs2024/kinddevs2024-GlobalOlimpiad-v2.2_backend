import mongoose from 'mongoose';

const portfolioReservationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
    trim: true
  },
  portfolioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: [true, 'Portfolio ID is required'],
    index: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Ensure a user can only reserve a portfolio once
portfolioReservationSchema.index({ userId: 1, portfolioId: 1 }, { unique: true });

// Index for efficient queries
portfolioReservationSchema.index({ userId: 1, createdAt: -1 });
portfolioReservationSchema.index({ portfolioId: 1 });

const PortfolioReservation = mongoose.models.PortfolioReservation || mongoose.model('PortfolioReservation', portfolioReservationSchema);

export default PortfolioReservation;

