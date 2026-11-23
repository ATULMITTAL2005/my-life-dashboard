/* eslint-disable no-console */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { connectDB, disconnectDB } = require('../config/db');
const { seedDemoData } = require('./seedData');

(async () => {
  try {
    await connectDB();
    await seedDemoData({ quiet: false });
    await disconnectDB();
    console.log('\n✅ Seed complete. Sign in with demo@mylifedashboard.app / Demo1234!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    await disconnectDB();
    process.exit(1);
  }
})();
