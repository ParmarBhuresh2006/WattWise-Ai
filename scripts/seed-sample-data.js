/**
 * seed-sample-data.js — CLI script to seed sample energy readings into MongoDB.
 * Usage: node scripts/seed-sample-data.js [email] [days]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const mongoose = require('mongoose');
const User = require('../backend/src/models/User');
const EnergyReading = require('../backend/src/models/EnergyReading');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wattwise';
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@wattwise.local';
  const days = parseInt(process.argv[3] || '60', 10);

  console.log(`[seed-sample] Connecting to MongoDB: ${uri}`);
  await mongoose.connect(uri);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`[seed-sample] User not found with email: ${email}`);
    console.error('Please register first via the UI or run "npm run seed:admin" in backend/');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`[seed-sample] Generating ${days} days of sample data for: ${user.name} (${user.email})`);

  const now = new Date();
  const toInsert = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(12, 0, 0, 0);

    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseKwh = 10.0;
    const weekendFactor = isWeekend ? 1.2 : 1.0;
    const seasonal = 1.0 + 0.15 * Math.sin((d.getMonth() / 12) * 2 * Math.PI);
    const noise = (Math.random() - 0.5) * 1.8;
    const kwh = Math.max(1.0, +(baseKwh * weekendFactor * seasonal + noise).toFixed(3));

    toInsert.push({
      user: user._id,
      readingDate: d,
      kWh: kwh,
      meterId: 'main',
      category: 'residential',
      notes: 'SYNTHETIC_SAMPLE_DATA_NOT_REAL_MEASUREMENTS',
      source: 'generated_sample',
      isSample: true,
    });
  }

  // Remove previous sample data for this user to avoid duplicates
  const deleted = await EnergyReading.deleteMany({ user: user._id, isSample: true });
  console.log(`[seed-sample] Cleared ${deleted.deletedCount} previous sample readings.`);

  const inserted = await EnergyReading.insertMany(toInsert);
  console.log(`[seed-sample] Successfully inserted ${inserted.length} sample readings.`);

  await mongoose.disconnect();
  console.log('[seed-sample] Finished successfully.');
}

main().catch((err) => {
  console.error('[seed-sample] Error:', err.message);
  process.exit(1);
});
