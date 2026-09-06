const cors = require('cors');

function createCorsMiddleware() {
  const originsEnv = process.env.CORS_ORIGINS || '';
  const whitelist = originsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (server-to-server, mobile apps, curl)
      if (!origin) return callback(null, true);
      if (whitelist.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });
}

module.exports = { createCorsMiddleware };
