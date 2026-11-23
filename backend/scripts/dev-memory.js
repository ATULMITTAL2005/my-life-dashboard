/**
 * Starts the API with a temporary in-memory MongoDB and fresh demo data.
 * No MongoDB installation or .env required: `npm run dev:memory`
 */
process.env.USE_MEMORY_DB = 'true';
process.env.AUTO_SEED = 'true';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'dev-only-in-memory-secret-do-not-use-in-production-9f3c2a';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

require('../src/server');
