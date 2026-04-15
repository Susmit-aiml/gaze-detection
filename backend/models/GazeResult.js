const mongoose = require("mongoose");

const gazeResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    gazeLabel: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    decisionPath: {
      type: String,
      default: "",
      trim: true,
    },
    modelVersion: {
      type: String,
      default: "",
      trim: true,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GazeResult", gazeResultSchema);
