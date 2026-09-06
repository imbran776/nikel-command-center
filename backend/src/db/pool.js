const mysql = require('mysql2/promise');

let pool = null;

function createPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mining_command',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  return pool;
}

async function getPool() {
  const p = createPool();

  // Connection retry with exponential backoff (3 attempts)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const conn = await p.getConnection();
      conn.release();
      console.log(`[DB] Connected (attempt ${attempt})`);
      return p;
    } catch (err) {
      console.error(`[DB] Connection attempt ${attempt}/3 failed: ${err.message}`);
      if (attempt === 3) throw err;
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

module.exports = { getPool, createPool };
