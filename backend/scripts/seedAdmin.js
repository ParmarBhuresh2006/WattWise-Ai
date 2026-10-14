require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');

async function seedAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wattwise';
  await mongoose.connect(uri);

  const email = process.env.ADMIN_EMAIL || 'admin@wattwise.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin@WattWise2024';
  const name = 'WattWise Admin';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[seed] Admin already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  await User.create({ name, email, password, role: 'admin' });
  console.log(`[seed] Admin created: ${email}`);
  await mongoose.disconnect();
}

seedAdmin().catch((err) => { console.error(err); process.exit(1); });

