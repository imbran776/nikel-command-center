import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Vite plugin that provides in-memory GPS API endpoints for dev/tunnel usage.
 * These endpoints allow mobile phones to register & send GPS positions,
 * and the web dashboard to poll device positions — all via HTTP REST.
 */
function gpsApiPlugin(): Plugin {
  // Server-side in-memory store for cross-device network sync
  const gpsStore: Record<string, any> = {}

  return {
    name: 'gps-api-middleware',
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const urlObj = new URL(req.url || '/', 'http://localhost')
        const pathname = urlObj.pathname.replace(/\/+$/, '') // trim trailing slash

        if (!pathname.startsWith('/api/gps')) {
          return next()
        }

        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.setHeader('Content-Type', 'application/json')

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        // Register invite code from Laptop
        if (pathname === '/api/gps/invite' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              if (payload.code) {
                gpsStore[payload.code] = {
                  ...(gpsStore[payload.code] || {}),
                  id: payload.id || `gps-${Date.now()}`,
                  code: payload.code,
                  inviteCode: payload.code,
                  name: payload.name || 'Perangkat HP',
                  unitLabel: payload.unitLabel || '',
                  status: 'pending',
                  lastSeen: new Date().toISOString(),
                }
              }
              res.end(JSON.stringify({ success: true }))
            } catch (e) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid payload' }))
            }
          })
          return
        }

        // List all devices
        if (pathname === '/api/gps/devices' && req.method === 'GET') {
          res.end(JSON.stringify({ devices: Object.values(gpsStore) }))
          return
        }

        // Register device from Mobile
        if (pathname === '/api/gps/register' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              const key = payload.code || payload.id || `MOB-${Date.now()}`
              const existing = gpsStore[key] || {}

              gpsStore[key] = {
                ...existing,
                id: existing.id || `gps-${Date.now()}`,
                code: key,
                inviteCode: key,
                name: payload.deviceName || existing.name || 'HP GPS Device',
                unitLabel: payload.unitLabel || existing.unitLabel || 'MOB-01',
                operatorName: payload.operatorName || payload.driverName || existing.operatorName || 'Operator Lapangan',
                platform: payload.platform || existing.platform || 'android',
                lat: payload.lat,
                lng: payload.lng,
                speedKph: payload.speedKph ?? 0,
                heading: payload.heading ?? 0,
                status: payload.status || 'online',
                operationalStatus: payload.operationalStatus || 'Hauling',
                engineStatus: payload.engineStatus || 'Running',
                payloadT: payload.payloadT ?? 42,
                fuelPct: payload.fuelPct ?? 85,
                destination: payload.destination || 'Crusher Pad',
                assignment: payload.assignment || 'Pit North Haulage',
                tripsToday: payload.tripsToday ?? 0,
                sos: payload.sos ?? false,
                accuracyM: payload.accuracy || payload.accuracyM,
                batteryPct: payload.batteryPct ?? 98,
                lastSeen: new Date().toISOString(),
                registeredAt: new Date().toISOString(),
                trail: [{ lat: payload.lat, lng: payload.lng, ts: new Date().toISOString() }],
              }
              res.end(JSON.stringify({ success: true, device: gpsStore[key] }))
            } catch (e) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid payload' }))
            }
          })
          return
        }

        // Real-time location update from Mobile
        if (pathname === '/api/gps/update' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              const {
                id,
                code,
                lat,
                lng,
                accuracy,
                accuracyM,
                batteryPct,
                unitLabel,
                deviceName,
                name,
                speedKph,
                heading,
                status,
                operationalStatus,
                engineStatus,
                payloadT,
                fuelPct,
                destination,
                assignment,
                tripsToday,
                sos,
                sosMessage,
                operatorName,
                driverName,
              } = payload
              const key = code || id
              if (!key) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Missing device id or code' }))
                return
              }
              const existing = gpsStore[key] || { id: key, trail: [] }
              const prevTrail = existing.trail || []
              const lastPt = prevTrail[prevTrail.length - 1]

              // Filter out near-identical positions (<0.00005 deg) and reset if impossible jump (>0.05 deg)
              const isSignificantMove = !lastPt || (Math.abs(lastPt.lat - lat) > 0.00005 || Math.abs(lastPt.lng - lng) > 0.00005)
              const isReasonableJump = !lastPt || (Math.abs(lastPt.lat - lat) < 0.05 && Math.abs(lastPt.lng - lng) < 0.05)

              let newTrail = prevTrail
              if (!isReasonableJump) {
                newTrail = [{ lat, lng, ts: new Date().toISOString() }]
              } else if (isSignificantMove) {
                newTrail = [...prevTrail, { lat, lng, ts: new Date().toISOString() }].slice(-60)
              }

              gpsStore[key] = {
                ...existing,
                id: existing.id || key,
                name: deviceName || name || unitLabel || existing.name || 'HP GPS Device',
                unitLabel: unitLabel || existing.unitLabel || 'MOB-01',
                operatorName: operatorName || driverName || existing.operatorName || 'Operator Lapangan',
                lat,
                lng,
                speedKph: speedKph !== undefined ? speedKph : existing.speedKph ?? 0,
                heading: heading !== undefined ? heading : existing.heading ?? 0,
                accuracyM: accuracy ?? accuracyM ?? existing.accuracyM,
                batteryPct: batteryPct ?? existing.batteryPct,
                status: status || 'online',
                operationalStatus: operationalStatus || existing.operationalStatus || 'Hauling',
                engineStatus: engineStatus || existing.engineStatus || 'Running',
                payloadT: payloadT !== undefined ? payloadT : existing.payloadT ?? 42,
                fuelPct: fuelPct !== undefined ? fuelPct : existing.fuelPct ?? 85,
                destination: destination || existing.destination || 'Crusher Pad',
                assignment: assignment || existing.assignment || 'Pit North Haulage',
                tripsToday: tripsToday !== undefined ? tripsToday : existing.tripsToday ?? 0,
                sos: sos !== undefined ? sos : existing.sos ?? false,
                sosMessage: sosMessage || existing.sosMessage,
                lastSeen: new Date().toISOString(),
                trail: newTrail,
              }
              res.end(JSON.stringify({ success: true, device: gpsStore[key] }))
            } catch (e) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid payload' }))
            }
          })
          return
        }

        // Reset device trail history
        if (pathname === '/api/gps/reset-trail' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              const key = payload.code || payload.id
              if (key && gpsStore[key]) {
                gpsStore[key].trail = []
              }
              res.end(JSON.stringify({ success: true }))
            } catch (e) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid payload' }))
            }
          })
          return
        }

        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Endpoint not found' }))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_'])
  const processEnvDefines: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value)
  }

  return {
    plugins: [react(), tailwindcss(), gpsApiPlugin()],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
    server: {
      allowedHosts: true, // Allow all incoming tunnel domain hosts (ngrok, localtunnel, trycloudflare, etc.)
    },
  }
})
