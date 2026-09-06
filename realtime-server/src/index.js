require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = require('http').createServer(app);

// Simple CORS from env for HTTP routes
const originsEnv = process.env.CORS_ORIGINS || '';
const whitelist = originsEnv.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (whitelist.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
}));

app.use(helmet());
app.use(express.json());

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: whitelist.length > 0 ? whitelist : '*', // Use whitelist if available, otherwise allow all for dev
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`[Realtime] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Realtime] Client disconnected: ${socket.id}`);
  });
});

// Internal endpoint to trigger broadcasts
// Protected by a simple secret to prevent external abuse
app.post('/internal/broadcast', (req, res) => {
  const authHeader = req.headers.authorization;
  const internalSecret = process.env.INTERNAL_SECRET;
  
  // Basic security to ensure only our backend REST API can trigger broadcasts
  if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { event, data } = req.body;
  if (!event || !data) {
    return res.status(400).json({ error: 'Missing event or data' });
  }

  io.emit(event, data);
  res.json({ success: true, message: `Broadcasted event: ${event}` });
});

// Health check for Railway
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'realtime-server' }));

const PORT = parseInt(process.env.PORT || '4000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Realtime Server] Running on 0.0.0.0:${PORT}`);
});
