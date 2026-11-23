/**
 * Seeds a temporary in-memory MongoDB (useful to verify seed data without Mongo).
 */
process.env.USE_MEMORY_DB = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-only-in-memory-secret';

const { connectDB, disconnectDB } = require('../src/config/db');
const { seedDemoData } = require('../src/seed/seedData');

(async () => {
  try {
    await connectDB();
    await seedDemoData({ quiet: false });
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error(err);
    await disconnectDB();
    process.exit(1);
  }
})();
