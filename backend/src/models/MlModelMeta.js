const mongoose = require('mongoose');

const mlModelMetaSchema = new mongoose.Schema(
  {
    version: { type: String, required: true },
    trainedAt: { type: Date, required: true },
    algorithm: { type: String, required: true },
    features: [String],
    trainingSamples: { type: Number },
    metrics: {
      mae: Number,
      rmse: Number,
      r2: Number,
      baselineMae: Number,
      baselineRmse: Number,
    },
    modelPath: { type: String },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MlModelMeta', mlModelMetaSchema);
