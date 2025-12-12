import mongoose from 'mongoose';

const cameraCaptureSchema = new mongoose.Schema({
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
  imagePath: {
    type: String,
    required: true
  },
  captureType: {
    type: String,
    enum: ['camera', 'screen'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
cameraCaptureSchema.index({ userId: 1, olympiadId: 1, timestamp: -1 });

const CameraCapture = mongoose.models.CameraCapture || mongoose.model('CameraCapture', cameraCaptureSchema);

export default CameraCapture;

