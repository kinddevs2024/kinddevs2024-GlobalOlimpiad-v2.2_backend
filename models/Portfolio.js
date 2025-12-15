import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    issuedBy: {
      type: String,
      trim: true,
    },
    issuedDate: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: true }
);

const portfolioSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, "Student ID is required"],
      index: true,
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      validate: {
        validator: function (v) {
          // Alphanumeric and hyphens only, 3-50 characters
          return /^[a-z0-9-]{3,50}$/.test(v);
        },
        message:
          "Slug must be 3-50 characters and contain only lowercase letters, numbers, and hyphens",
      },
    },
    visibility: {
      type: String,
      enum: ["public", "private", "unlisted"],
      default: "private",
      index: true,
    },
    layout: {
      type: String,
      enum: ["single-page", "multi-page"],
      default: "single-page",
    },
    theme: {
      name: {
        type: String,
        trim: true,
      },
      colors: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      typography: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      spacing: {
        type: String,
        enum: ["compact", "comfortable", "spacious"],
        default: "comfortable",
      },
      // Legacy support
      fonts: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      styles: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    hero: {
      title: String,
      subtitle: String,
      image: String,
      ctaText: String,
      ctaLink: String,
    },
    sections: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    certificates: {
      type: [certificateSchema],
      default: [],
    },
    animations: {
      enabled: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        enum: ["fade", "slide", "none"],
        default: "fade",
      },
    },
    // Legacy field - kept for backward compatibility
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
portfolioSchema.index({ studentId: 1, visibility: 1 });
portfolioSchema.index({ studentId: 1, isPublic: 1 }); // Legacy support
portfolioSchema.index({ slug: 1, visibility: 1 });
portfolioSchema.index({ slug: 1, isPublic: 1 }); // Legacy support

const Portfolio =
  mongoose.models.Portfolio || mongoose.model("Portfolio", portfolioSchema);

export default Portfolio;
