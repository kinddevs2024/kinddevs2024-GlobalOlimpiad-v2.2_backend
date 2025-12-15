import mongoose from 'mongoose';

const portfolioViewSchema = new mongoose.Schema({
  portfolioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: [true, 'Portfolio ID is required'],
    index: true
  },
  viewerType: {
    type: String,
    enum: ['public', 'university'],
    required: [true, 'Viewer type is required']
  },
  ipHash: {
    type: String,
    required: [true, 'IP hash is required'],
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for analytics queries
portfolioViewSchema.index({ portfolioId: 1, timestamp: -1 });
portfolioViewSchema.index({ viewerType: 1, timestamp: -1 });

const PortfolioView = mongoose.models.PortfolioView || mongoose.model('PortfolioView', portfolioViewSchema);

export default PortfolioView;

