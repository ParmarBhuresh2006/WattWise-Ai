const mongoose = require('mongoose');

const energyReadingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    readingDate: {
      type: Date,
      required: [true, 'Reading date is required'],
      index: true,
    },
    kWh: {
      type: Number,
      required: [true, 'Energy reading (kWh) is required'],
      min: [0, 'kWh cannot be negative'],
      max: [100000, 'kWh value seems unrealistically large'],
    },
    meterId: {
      type: String,
      trim: true,
      default: 'main',
      maxlength: [50, 'Meter ID too long'],
    },
    category: {
      type: String,
      enum: ['residential', 'commercial', 'industrial', 'other', ''],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    source: {
      type: String,
      enum: ['manual', 'csv_import', 'generated_sample'],
      default: 'manual',
    },
    isSample: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for efficient per-user date queries
energyReadingSchema.index({ user: 1, readingDate: -1 });
energyReadingSchema.index({ user: 1, meterId: 1, readingDate: -1 });

module.exports = mongoose.model('EnergyReading', energyReadingSchema);
