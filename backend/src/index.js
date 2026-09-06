require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { createCorsMiddleware } = require('./middleware/corsConfig');
const { generalLimiter } = require('./middleware/rateLimiter');
const { getPool } = require('./db/pool');
const { initDatabase } = require('./db/init');
const authRoutes = require('./routes/auth');
const gpsRoutes = require('./routes/gps');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust proxy (Railway reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Morgan logging — skip credential headers
morgan.token('sanitized-headers', (req) => {
  const headers = { ...req.headers };
  delete headers.authorization;
  delete headers.cookie;
  return JSON.stringify(headers);
});
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// CORS whitelist from env
app.use(createCorsMiddleware());

// General rate limiter
app.use(generalLimiter);

// JSON body parser
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/gps', gpsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with DB init
async function start() {
  try {
    const pool = await getPool();
    await initDatabase(pool);
    console.log('[DB] Initialization complete.');
  } catch (err) {
    console.error('[DB] Failed to initialize database:', err.message);
    console.warn('[Server] Starting without database — some routes will fail.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Mining Command API running on 0.0.0.0:${PORT}`);
  });
}

start();
