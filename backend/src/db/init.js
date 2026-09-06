const bcrypt = require('bcryptjs');

const ALL_MODULES = JSON.stringify([
  'dashboard','live-ops','dispatch','fleet','production','equipment',
  'equipment-detail','maintenance','fuel','spare-parts','operators',
  'alerts','reports','analytics','users','roles','settings','audit-logs'
]);

const OPS_MODULES = JSON.stringify([
  'dashboard','live-ops','dispatch','fleet','production','equipment',
  'equipment-detail','operators','alerts','reports','analytics','settings','users'
]);

const CREATE_USERS = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin','ops_lead','dispatcher','maintenance','analyst') NOT NULL DEFAULT 'ops_lead',
  role_label VARCHAR(255) DEFAULT '',
  site VARCHAR(255) DEFAULT 'Central Command',
  status ENUM('Active','Idle','Offline') DEFAULT 'Active',
  avatar_url TEXT,
  modules JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

const CREATE_DEVICES = `
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(100) UNIQUE,
  invite_code VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  unit_label VARCHAR(100) DEFAULT '',
  operator_name VARCHAR(255) DEFAULT '',
  platform ENUM('android','ios','ble') DEFAULT 'android',
  status ENUM('online','offline','stale','pending') DEFAULT 'pending',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

const CREATE_GPS_POSITIONS = `
CREATE TABLE IF NOT EXISTS gps_positions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(36) NOT NULL,
  code VARCHAR(100),
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  speed_kph DECIMAL(6,1) DEFAULT 0,
  heading DECIMAL(5,1) DEFAULT 0,
  accuracy_m DECIMAL(6,1),
  battery_pct INT,
  operational_status VARCHAR(50) DEFAULT 'Hauling',
  engine_status VARCHAR(50) DEFAULT 'Running',
  payload_t DECIMAL(6,1),
  fuel_pct INT,
  destination VARCHAR(255),
  assignment VARCHAR(255),
  trips_today INT DEFAULT 0,
  sos BOOLEAN DEFAULT FALSE,
  sos_message TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_time (device_id, recorded_at),
  INDEX idx_code (code)
)`;

async function initDatabase(pool) {
  console.log('[DB] Creating tables if not exist...');

  await pool.query(CREATE_USERS);
  await pool.query(CREATE_DEVICES);
  await pool.query(CREATE_GPS_POSITIONS);

  console.log('[DB] Tables ready. Seeding demo users...');

  const adminHash = await bcrypt.hash('admin123', 10);
  const opsHash = await bcrypt.hash('ops123', 10);

  const seedUsers = [
    ['u-admin', 'imbran@mineops.local', adminHash, 'Imbran', 'admin', 'System Admin', 'Central Command', ALL_MODULES],
    ['u-ops-aldi', 'aldi@mineops.local', opsHash, 'Aldi', 'ops_lead', 'Ops Lead - Pit North', 'Pit North', OPS_MODULES],
    ['u-ops-dani', 'dani@mineops.local', opsHash, 'Dani', 'ops_lead', 'Ops Lead - Dispatch', 'Pit North', OPS_MODULES],
    ['u-ops-arsyil', 'arsyil@mineops.local', opsHash, 'Arsyil', 'ops_lead', 'Ops Lead - Fleet Control', 'Pit North', OPS_MODULES],
    ['u-ops-putri', 'putri@mineops.local', opsHash, 'Putri', 'ops_lead', 'Ops Lead - Production', 'Pit North', OPS_MODULES],
  ];

  const insertSQL = `
    INSERT IGNORE INTO users (id, email, password_hash, name, role, role_label, site, modules)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const user of seedUsers) {
    await pool.query(insertSQL, user);
  }

  console.log('[DB] Demo users seeded.');
}

module.exports = { initDatabase };
