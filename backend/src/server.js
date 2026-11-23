const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  await connectDB();

  if (process.env.AUTO_SEED === 'true') {
    const { seedDemoData } = require('./seed/seedData');
    await seedDemoData({ quiet: false });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌿 My Life Dashboard API listening on http://localhost:${PORT}`);
    console.log(`   Allowed client origin(s): ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  if (process.env.USE_MEMORY_DB !== 'true') {
    console.error('   Check that MongoDB is running and MONGODB_URI in backend/.env is correct.');
  }
  process.exit(1);
});
