const mongoose = require('mongoose');

let memoryServer = null;

/**
 * Connect to MongoDB. When USE_MEMORY_DB=true a temporary in-memory MongoDB
 * instance is started instead — handy for previewing without installing Mongo.
 */
async function connectDB() {
  let uri = process.env.MONGODB_URI;

  if (process.env.USE_MEMORY_DB === 'true') {
    // Loaded lazily so production installs never need the extra package.
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: 'my_life_dashboard', launchTimeout: 60000 },
    });
    uri = memoryServer.getUri();
    console.log('🧪 Using temporary in-memory MongoDB (data resets on restart)');
  }

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy backend/.env.example to backend/.env and add a connection string.'
    );
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const { host, name } = mongoose.connection;
  console.log(`✅ MongoDB connected (${name} @ ${host})`);

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDB, disconnectDB };
