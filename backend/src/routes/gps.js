const express = require('express');
const crypto = require('crypto');
const { createPool } = require('../db/pool');

const router = express.Router();

// POST /api/gps/invite — create or update device invite
router.post('/invite', async (req, res) => {
  try {
    const { id, code, name, unitLabel, operatorName, platform } = req.body;
    const pool = createPool();

    const deviceId = id || crypto.randomUUID();
    const deviceCode = code || `MC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const inviteCode = code || crypto.randomBytes(4).toString('hex').toUpperCase();

    await pool.query(
      `INSERT INTO devices (id, code, invite_code, name, unit_label, operator_name, platform, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE
         name = COALESCE(VALUES(name), name),
         unit_label = COALESCE(VALUES(unit_label), unit_label),
         operator_name = COALESCE(VALUES(operator_name), operator_name),
         platform = COALESCE(VALUES(platform), platform),
         invite_code = VALUES(invite_code)`,
      [deviceId, deviceCode, inviteCode, name || 'Unnamed Device', unitLabel || '', operatorName || '', platform || 'android']
    );

    res.json({ success: true, id: deviceId, code: deviceCode, inviteCode });
  } catch (err) {
    console.error('[GPS] invite error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/gps/devices — list all devices with latest position
// Returns { devices: [...] } to match frontend expectation
router.get('/devices', async (_req, res) => {
  try {
    const pool = createPool();

    const [devices] = await pool.query('SELECT * FROM devices ORDER BY last_seen DESC');

    // For each device, get latest GPS position
    const result = [];
    for (const device of devices) {
      const [positions] = await pool.query(
        `SELECT lat, lng, speed_kph AS speedKph, heading, accuracy_m AS accuracyM,
                battery_pct AS batteryPct, operational_status AS operationalStatus,
                engine_status AS engineStatus, payload_t AS payloadT,
                fuel_pct AS fuelPct, destination, assignment,
                trips_today AS tripsToday, sos, sos_message AS sosMessage,
                recorded_at AS lastSeen
         FROM gps_positions WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1`,
        [device.id]
      );

      const pos = positions[0] || {};
      result.push({
        id: device.id,
        code: device.code,
        inviteCode: device.invite_code,
        name: device.name,
        unitLabel: device.unit_label,
        operatorName: device.operator_name,
        platform: device.platform,
        status: device.status,
        lastSeen: device.last_seen,
        registeredAt: device.registered_at,
        lat: pos.lat != null ? Number(pos.lat) : undefined,
        lng: pos.lng != null ? Number(pos.lng) : undefined,
        speedKph: pos.speedKph != null ? Number(pos.speedKph) : 0,
        heading: pos.heading != null ? Number(pos.heading) : 0,
        accuracyM: pos.accuracyM != null ? Number(pos.accuracyM) : undefined,
        batteryPct: pos.batteryPct,
        operationalStatus: pos.operationalStatus || 'Hauling',
        engineStatus: pos.engineStatus || 'Running',
        payloadT: pos.payloadT != null ? Number(pos.payloadT) : undefined,
        fuelPct: pos.fuelPct,
        destination: pos.destination,
        assignment: pos.assignment,
        tripsToday: pos.tripsToday || 0,
        sos: pos.sos || false,
        sosMessage: pos.sosMessage,
      });
    }

    res.json({ devices: result });
  } catch (err) {
    console.error('[GPS] devices error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/gps/register — register mobile GPS device
// Accepts the same payload format that frontend MobileTrackerPage sends
router.post('/register', async (req, res) => {
  try {
    const {
      code, id, deviceName, unitLabel, operatorName, driverName,
      platform, lat, lng, speedKph, heading, operationalStatus,
      engineStatus, payloadT, fuelPct, destination, tripsToday,
      sos, accuracy,
    } = req.body;

    const pool = createPool();
    const key = code || id;

    if (!key) {
      return res.status(400).json({ error: 'code or id is required' });
    }

    const deviceId = `gps-${Date.now()}`;
    const deviceCode = key;

    // Upsert device
    await pool.query(
      `INSERT INTO devices (id, code, invite_code, name, unit_label, operator_name, platform, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'online')
       ON DUPLICATE KEY UPDATE
         name = COALESCE(VALUES(name), name),
         unit_label = COALESCE(VALUES(unit_label), unit_label),
         operator_name = COALESCE(VALUES(operator_name), operator_name),
         platform = COALESCE(VALUES(platform), platform),
         status = 'online',
         last_seen = CURRENT_TIMESTAMP`,
      [deviceId, deviceCode, deviceCode, deviceName || unitLabel || 'HP GPS Device',
       unitLabel || '', operatorName || driverName || '', platform || 'android']
    );

    // Get the actual device id (might be existing)
    const [rows] = await pool.query('SELECT id FROM devices WHERE code = ?', [deviceCode]);
    const actualId = rows.length > 0 ? rows[0].id : deviceId;

    // Insert initial GPS position
    if (lat != null && lng != null) {
      await pool.query(
        `INSERT INTO gps_positions
          (device_id, code, lat, lng, speed_kph, heading, accuracy_m,
           operational_status, engine_status, payload_t, fuel_pct,
           destination, trips_today, sos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [actualId, deviceCode, lat, lng, speedKph || 0, heading || 0, accuracy || null,
         operationalStatus || 'Hauling', engineStatus || 'Running',
         payloadT || null, fuelPct || null, destination || null,
         tripsToday || 0, sos || false]
      );
    }

    const [deviceRows] = await pool.query('SELECT * FROM devices WHERE code = ?', [deviceCode]);
    const device = deviceRows[0] || {};

    res.json({
      success: true,
      device: {
        id: device.id,
        code: device.code,
        name: device.name,
        unitLabel: device.unit_label,
        operatorName: device.operator_name,
        status: device.status,
        lastSeen: device.last_seen,
        lat, lng,
      },
    });
  } catch (err) {
    console.error('[GPS] register error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/gps/update — receive GPS position update
// Accepts the same payload format that frontend MobileTrackerPage broadcasts
router.post('/update', async (req, res) => {
  try {
    const {
      id, code, lat, lng, speedKph, heading, accuracyM, accuracy,
      batteryPct, operationalStatus, engineStatus, payloadT,
      fuelPct, destination, assignment, tripsToday, sos, sosMessage,
      unitLabel, deviceName, name, operatorName, driverName,
    } = req.body;

    const key = code || id;
    if (!key || lat == null || lng == null) {
      return res.status(400).json({ error: 'code/id, lat, and lng are required' });
    }

    const pool = createPool();

    // Ensure device exists
    const [existing] = await pool.query('SELECT id FROM devices WHERE code = ?', [key]);
    let deviceId;
    if (existing.length > 0) {
      deviceId = existing[0].id;
    } else {
      deviceId = `gps-${Date.now()}`;
      await pool.query(
        `INSERT INTO devices (id, code, name, unit_label, operator_name, status)
         VALUES (?, ?, ?, ?, ?, 'online')`,
        [deviceId, key, deviceName || name || unitLabel || 'GPS Device',
         unitLabel || '', operatorName || driverName || '']
      );
    }

    // Insert GPS position
    await pool.query(
      `INSERT INTO gps_positions
        (device_id, code, lat, lng, speed_kph, heading, accuracy_m, battery_pct,
         operational_status, engine_status, payload_t, fuel_pct, destination,
         assignment, trips_today, sos, sos_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deviceId, key, lat, lng,
        speedKph || 0, heading || 0, accuracyM || accuracy || null,
        batteryPct || null,
        operationalStatus || 'Hauling', engineStatus || 'Running',
        payloadT || null, fuelPct || null, destination || null,
        assignment || null, tripsToday || 0, sos || false, sosMessage || null,
      ]
    );

    // Update device last_seen and status
    await pool.query(
      `UPDATE devices SET status = 'online', last_seen = CURRENT_TIMESTAMP WHERE id = ?`,
      [deviceId]
    );

    const updatedDeviceData = {
      id: deviceId,
      code: key,
      lat, lng, speedKph, heading, accuracyM, batteryPct,
      operationalStatus, engineStatus, payloadT, fuelPct,
      destination, assignment, tripsToday, sos, sosMessage,
      unitLabel: unitLabel || '',
      name: deviceName || name || unitLabel || 'GPS Device',
      operatorName: operatorName || driverName || ''
    };

    // Trigger broadcast via Realtime Server (internal network)
    const realtimeUrl = process.env.REALTIME_SERVICE_URL;
    const internalSecret = process.env.INTERNAL_SECRET || '';

    if (realtimeUrl) {
      try {
        fetch(`${realtimeUrl}/internal/broadcast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': internalSecret ? `Bearer ${internalSecret}` : undefined
          },
          body: JSON.stringify({
            event: 'gps-update',
            data: updatedDeviceData
          })
        }).catch(err => console.error('[GPS] Failed to trigger realtime broadcast:', err.message));
      } catch (err) {
        // Ignore synchronous fetch errors
      }
    }

    res.json({ success: true, device: { id: deviceId, code: key } });
  } catch (err) {
    console.error('[GPS] update error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/gps/reset-trail — delete trail history for a device
router.post('/reset-trail', async (req, res) => {
  try {
    const { id, code, deviceId } = req.body;
    const key = deviceId || id || code;

    if (!key) {
      return res.status(400).json({ error: 'deviceId, id, or code is required' });
    }

    const pool = createPool();

    // Try by device id first, then by code
    const [result1] = await pool.query('DELETE FROM gps_positions WHERE device_id = ?', [key]);
    if (result1.affectedRows === 0) {
      await pool.query('DELETE FROM gps_positions WHERE code = ?', [key]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[GPS] reset-trail error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/gps/devices/:id/trail — get last 60 GPS positions
router.get('/devices/:id/trail', async (req, res) => {
  try {
    const pool = createPool();
    const deviceId = req.params.id;

    const [positions] = await pool.query(
      `SELECT lat, lng, speed_kph AS speedKph, heading,
              accuracy_m AS accuracyM, recorded_at AS ts
       FROM gps_positions
       WHERE device_id = ?
       ORDER BY recorded_at DESC
       LIMIT 60`,
      [deviceId]
    );

    res.json(positions.reverse()); // Return in chronological order
  } catch (err) {
    console.error('[GPS] trail error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
