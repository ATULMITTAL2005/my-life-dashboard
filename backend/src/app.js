const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const healthRoutes = require('./routes/health');
const dashboardRoutes = require('./routes/dashboard');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// In development, allow any origin so the app can be reached from phones and
// other devices on the local network (e.g. http://192.168.x.x:5173).
const isDev = process.env.NODE_ENV !== 'production';

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      // Allow tools/curl with no Origin header.
      if (!origin) return callback(null, true);
      if (isDev) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('This origin is not allowed by CORS.'));
    },
  })
);
app.use(express.json({ limit: '100kb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', service: 'my-life-dashboard-api', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
