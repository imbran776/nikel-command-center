import type {
  DispatchJob,
  FleetAsset,
  FuelEvent,
  KpiMetric,
  MineSite,
  NotificationItem,
  Operator,
  OpsAlert,
  ProductionPoint,
  ShiftInfo,
  WorkOrder,
} from '../types/fms';

export const MINES: MineSite[] = [
  { id: 'mn-n', name: 'Pit North', code: 'PIT-N' },
  { id: 'mn-s', name: 'Pit South', code: 'PIT-S' },
  { id: 'mn-e', name: 'East Expansion', code: 'EAST-X' },
];

export const SHIFTS: ShiftInfo[] = [
  { id: 's-a', code: 'SHIFT-A', label: 'Day A · 06:00–18:00', start: '06:00', end: '18:00' },
  { id: 's-b', code: 'SHIFT-B', label: 'Night B · 18:00–06:00', start: '18:00', end: '06:00' },
  { id: 's-c', code: 'SHIFT-C', label: 'Swing C · 14:00–02:00', start: '14:00', end: '02:00' },
];

export const FLEET: FleetAsset[] = [
  {
    id: '1', unit: 'HT-04', type: 'Haul Truck', status: 'Hauling', engine: 'Running',
    connectivity: 'Online', operator: 'L. Wang', operatorId: 'op-2', fuelPct: 68, health: 88,
    engineHours: 12420, assignment: 'Load Face C → Crusher', location: 'Haul Road N',
    speedKph: 32, destination: 'Crusher Pad', payloadT: 185, lastUpdate: '14:38 UTC',
    cycleMin: 18.4, tripsToday: 14, availability: 94, utilization: 87, mapX: 62, mapY: 36,
  },
  {
    id: '2', unit: 'HT-06', type: 'Haul Truck', status: 'Loading', engine: 'Idle',
    connectivity: 'Online', operator: 'M. Okonkwo', operatorId: 'op-5', fuelPct: 54, health: 91,
    engineHours: 9802, assignment: 'Face B loading', location: 'Pit Zone B',
    speedKph: 0, destination: 'Dump East', payloadT: 42, lastUpdate: '14:37 UTC',
    cycleMin: 19.1, tripsToday: 11, availability: 96, utilization: 82, mapX: 38, mapY: 40,
  },
  {
    id: '3', unit: 'HT-07', type: 'Haul Truck', status: 'Maintenance', engine: 'Off',
    connectivity: 'Degraded', operator: 'L. Silva', operatorId: 'op-4', fuelPct: 22, health: 45,
    engineHours: 15680, assignment: 'Workshop Bay 2', location: 'Yard Maintenance',
    speedKph: 0, destination: '—', payloadT: 0, lastUpdate: '13:55 UTC',
    cycleMin: 0, tripsToday: 3, availability: 61, utilization: 22, mapX: 82, mapY: 78,
  },
  {
    id: '4', unit: 'HT-09', type: 'Haul Truck', status: 'Dumping', engine: 'Running',
    connectivity: 'Online', operator: 'S. Chen', operatorId: 'op-6', fuelPct: 41, health: 85,
    engineHours: 11210, assignment: 'Dump East circuit', location: 'Dump East',
    speedKph: 8, destination: 'Face C', payloadT: 12, lastUpdate: '14:38 UTC',
    cycleMin: 17.8, tripsToday: 15, availability: 92, utilization: 89, mapX: 74, mapY: 48,
  },
  {
    id: '5', unit: 'HT-11', type: 'Haul Truck', status: 'Waiting', engine: 'Idle',
    connectivity: 'Online', operator: 'J. Martinez', operatorId: 'op-7', fuelPct: 73, health: 90,
    engineHours: 8740, assignment: 'Queue Face C', location: 'Staging Pad',
    speedKph: 0, destination: 'Face C', payloadT: 0, lastUpdate: '14:36 UTC',
    cycleMin: 20.2, tripsToday: 10, availability: 95, utilization: 78, mapX: 55, mapY: 55,
  },
  {
    id: '6', unit: 'HT-14', type: 'Haul Truck', status: 'Breakdown', engine: 'Fault',
    connectivity: 'Offline', operator: 'A. Rossi', operatorId: 'op-8', fuelPct: 61, health: 28,
    engineHours: 14102, assignment: 'Hold — recovery', location: 'Haul Road S',
    speedKph: 0, destination: 'Workshop', payloadT: 160, lastUpdate: '13:12 UTC',
    cycleMin: 0, tripsToday: 6, availability: 48, utilization: 40, mapX: 48, mapY: 68,
  },
  {
    id: '7', unit: 'EX-01', type: 'Excavator', status: 'Loading', engine: 'Running',
    connectivity: 'Online', operator: 'R. Chen', operatorId: 'op-1', fuelPct: 77, health: 92,
    engineHours: 10220, assignment: 'Face C primary', location: 'Pit Zone C',
    speedKph: 0, destination: '—', payloadT: 0, lastUpdate: '14:38 UTC',
    cycleMin: 2.1, tripsToday: 0, availability: 97, utilization: 91, mapX: 54, mapY: 74,
  },
  {
    id: '8', unit: 'EX-03', type: 'Excavator', status: 'Active', engine: 'Running',
    connectivity: 'Online', operator: 'K. Patel', operatorId: 'op-3', fuelPct: 59, health: 86,
    engineHours: 11940, assignment: 'Face B secondary', location: 'Pit Zone B',
    speedKph: 0, destination: '—', payloadT: 0, lastUpdate: '14:37 UTC',
    cycleMin: 2.4, tripsToday: 0, availability: 93, utilization: 88, mapX: 36, mapY: 42,
  },
  {
    id: '9', unit: 'LD-02', type: 'Loader', status: 'Idle', engine: 'Idle',
    connectivity: 'Online', operator: 'T. Nguyen', operatorId: 'op-9', fuelPct: 80, health: 94,
    engineHours: 6204, assignment: 'Stockpile support', location: 'Stockpile West',
    speedKph: 0, destination: '—', payloadT: 0, lastUpdate: '14:30 UTC',
    cycleMin: 0, tripsToday: 0, availability: 98, utilization: 54, mapX: 28, mapY: 60,
  },
  {
    id: '10', unit: 'DZ-01', type: 'Dozer', status: 'Active', engine: 'Running',
    connectivity: 'Online', operator: 'P. Ibrahim', operatorId: 'op-10', fuelPct: 48, health: 83,
    engineHours: 9055, assignment: 'Dump pad cleanup', location: 'Dump East',
    speedKph: 6, destination: 'Dump East', payloadT: 0, lastUpdate: '14:35 UTC',
    cycleMin: 0, tripsToday: 0, availability: 91, utilization: 76, mapX: 70, mapY: 52,
  },
  {
    id: '11', unit: 'DR-05', type: 'Drill Rig', status: 'Active', engine: 'Running',
    connectivity: 'Degraded', operator: 'H. Kim', operatorId: 'op-11', fuelPct: 35, health: 79,
    engineHours: 7120, assignment: 'Blast pattern N-12', location: 'Bench North',
    speedKph: 0, destination: '—', payloadT: 0, lastUpdate: '14:20 UTC',
    cycleMin: 0, tripsToday: 0, availability: 88, utilization: 71, mapX: 44, mapY: 28,
  },
  {
    id: '12', unit: 'WT-03', type: 'Water Truck', status: 'Hauling', engine: 'Running',
    connectivity: 'Online', operator: 'F. Alvarez', operatorId: 'op-12', fuelPct: 62, health: 90,
    engineHours: 5401, assignment: 'Dust suppress HR-N', location: 'Haul Road N',
    speedKph: 24, destination: 'Fill Station', payloadT: 28, lastUpdate: '14:34 UTC',
    cycleMin: 0, tripsToday: 8, availability: 96, utilization: 70, mapX: 58, mapY: 44,
  },
];

export const OPERATORS: Operator[] = [
  { id: 'op-1', name: 'R. Chen', role: 'Excavator Operator', shift: 'SHIFT-B', assignedUnit: 'EX-01', hoursToday: 6.5, attendance: 'On Site', performance: 94, safetyScore: 98, certifications: ['EX-Class A', 'Radio Ops'], phone: '+1 555-0101', licenseExp: '2026-08-12' },
  { id: 'op-2', name: 'L. Wang', role: 'Haul Truck Operator', shift: 'SHIFT-B', assignedUnit: 'HT-04', hoursToday: 6.2, attendance: 'On Site', performance: 91, safetyScore: 96, certifications: ['HT-Class A'], phone: '+1 555-0102', licenseExp: '2025-11-30' },
  { id: 'op-3', name: 'K. Patel', role: 'Excavator Operator', shift: 'SHIFT-B', assignedUnit: 'EX-03', hoursToday: 5.8, attendance: 'On Site', performance: 88, safetyScore: 97, certifications: ['EX-Class A', 'Spotter'], phone: '+1 555-0103', licenseExp: '2026-02-01' },
  { id: 'op-4', name: 'L. Silva', role: 'Haul Truck Operator', shift: 'SHIFT-B', assignedUnit: 'HT-07', hoursToday: 2.0, attendance: 'Break', performance: 84, safetyScore: 93, certifications: ['HT-Class A'], phone: '+1 555-0104', licenseExp: '2025-09-18' },
  { id: 'op-5', name: 'M. Okonkwo', role: 'Haul Truck Operator', shift: 'SHIFT-B', assignedUnit: 'HT-06', hoursToday: 6.4, attendance: 'On Site', performance: 92, safetyScore: 99, certifications: ['HT-Class A', 'First Aid'], phone: '+1 555-0105', licenseExp: '2027-01-22' },
  { id: 'op-6', name: 'S. Chen', role: 'Haul Truck Operator', shift: 'SHIFT-B', assignedUnit: 'HT-09', hoursToday: 6.1, attendance: 'On Site', performance: 90, safetyScore: 95, certifications: ['HT-Class A'], phone: '+1 555-0106', licenseExp: '2026-04-09' },
  { id: 'op-7', name: 'J. Martinez', role: 'Haul Truck Operator', shift: 'SHIFT-B', assignedUnit: 'HT-11', hoursToday: 5.5, attendance: 'On Site', performance: 86, safetyScore: 94, certifications: ['HT-Class B'], phone: '+1 555-0107', licenseExp: '2025-12-15' },
  { id: 'op-8', name: 'A. Rossi', role: 'Haul Truck Operator', shift: 'SHIFT-B', assignedUnit: 'HT-14', hoursToday: 4.0, attendance: 'On Site', performance: 79, safetyScore: 91, certifications: ['HT-Class A'], phone: '+1 555-0108', licenseExp: '2026-06-03' },
  { id: 'op-9', name: 'T. Nguyen', role: 'Loader Operator', shift: 'SHIFT-B', assignedUnit: 'LD-02', hoursToday: 5.0, attendance: 'On Site', performance: 87, safetyScore: 98, certifications: ['LD-Class A'], phone: '+1 555-0109', licenseExp: '2026-10-20' },
  { id: 'op-10', name: 'P. Ibrahim', role: 'Dozer Operator', shift: 'SHIFT-B', assignedUnit: 'DZ-01', hoursToday: 5.9, attendance: 'On Site', performance: 89, safetyScore: 97, certifications: ['DZ-Class A', 'Spotter'], phone: '+1 555-0110', licenseExp: '2025-08-28' },
];

export const WORK_ORDERS: WorkOrder[] = [
  { id: 'WO-2401', unit: 'HT-07', type: 'Corrective', title: 'Transmission oil cooler leak', status: 'In Progress', priority: 'High', technician: 'Bay Tech · M. Torres', parts: 'Cooler assy, O-rings', costUsd: 4200, hoursRemaining: 18, dueDate: '2025-10-27', openedAt: '2025-10-26 08:10' },
  { id: 'WO-2402', unit: 'HT-14', type: 'Corrective', title: 'Engine fault code E-441 — recovery', status: 'Open', priority: 'Critical', technician: 'Field · J. Brooks', parts: 'TBD diagnostics', costUsd: 0, hoursRemaining: 0, dueDate: '2025-10-26', openedAt: '2025-10-26 13:15' },
  { id: 'WO-2403', unit: 'EX-03', type: 'Preventive', title: '500hr bucket & pin inspection', status: 'Open', priority: 'Normal', technician: 'Bay Tech · A. Liu', parts: 'Pins kit', costUsd: 980, hoursRemaining: 42, dueDate: '2025-10-29', openedAt: '2025-10-25 16:00' },
  { id: 'WO-2404', unit: 'HT-04', type: 'Preventive', title: 'Tire pressure & wear survey', status: 'Parts Hold', priority: 'Normal', technician: 'Yard · S. Park', parts: 'TPMS sensors x2', costUsd: 640, hoursRemaining: 120, dueDate: '2025-10-30', openedAt: '2025-10-24 11:20' },
  { id: 'WO-2405', unit: 'DR-05', type: 'Preventive', title: 'Compressor service interval', status: 'Completed', priority: 'Low', technician: 'Bay Tech · M. Torres', parts: 'Filter set', costUsd: 520, hoursRemaining: 200, dueDate: '2025-10-25', openedAt: '2025-10-23 09:00' },
  { id: 'WO-2406', unit: 'HT-09', type: 'Corrective', title: 'Brake wear sensor intermittent', status: 'Open', priority: 'High', technician: 'Unassigned', parts: 'Sensor harness', costUsd: 310, hoursRemaining: 65, dueDate: '2025-10-28', openedAt: '2025-10-26 10:40' },
];

export const FUEL_EVENTS: FuelEvent[] = [
  { id: 'f1', unit: 'HT-04', liters: 420, costUsd: 546, station: 'Fuel Pad A', operator: 'L. Wang', at: '06:40 UTC' },
  { id: 'f2', unit: 'EX-01', liters: 310, costUsd: 403, station: 'Fuel Pad A', operator: 'R. Chen', at: '07:05 UTC' },
  { id: 'f3', unit: 'HT-11', liters: 390, costUsd: 507, station: 'Fuel Pad B', operator: 'J. Martinez', at: '08:22 UTC' },
  { id: 'f4', unit: 'HT-09', liters: 405, costUsd: 526, station: 'Fuel Pad A', operator: 'S. Chen', at: '10:15 UTC' },
  { id: 'f5', unit: 'WT-03', liters: 180, costUsd: 234, station: 'Fuel Pad B', operator: 'F. Alvarez', at: '11:48 UTC' },
  { id: 'f6', unit: 'HT-06', liters: 410, costUsd: 533, station: 'Fuel Pad A', operator: 'M. Okonkwo', at: '12:30 UTC' },
];

export const ALERTS: OpsAlert[] = [
  { id: 'a1', severity: 'critical', code: 'ENG-441', title: 'Engine fault — unit immobilized on Haul Road S', category: 'Engine', unit: 'HT-14', time: '13:12 UTC', acknowledged: false },
  { id: 'a2', severity: 'critical', code: 'DT-04', title: 'Downtime threshold exceeded on pit face C', category: 'Production', unit: 'HT-07', time: '14:22 UTC', acknowledged: false },
  { id: 'a3', severity: 'warning', code: 'FU-12', title: 'Fuel burn rate above shift baseline', category: 'Fuel', unit: 'HT-04', time: '14:18 UTC', acknowledged: false },
  { id: 'a4', severity: 'warning', code: 'TEMP-09', title: 'Coolant temperature elevated during climb', category: 'Temperature', unit: 'HT-09', time: '14:05 UTC', acknowledged: false },
  { id: 'a5', severity: 'warning', code: 'MN-08', title: 'Scheduled service window overdue', category: 'Maintenance', unit: 'HT-07', time: '13:55 UTC', acknowledged: false },
  { id: 'a6', severity: 'warning', code: 'SPD-03', title: 'Overspeed event 48 kph in 35 zone', category: 'Overspeed', unit: 'HT-04', time: '12:44 UTC', acknowledged: true },
  { id: 'a7', severity: 'info', code: 'GPS-02', title: 'GPS fix degraded — secondary radio OK', category: 'GPS', unit: 'DR-05', time: '14:20 UTC', acknowledged: false },
  { id: 'a8', severity: 'info', code: 'COM-01', title: 'Telemetry latency spike recovered', category: 'Comms', unit: 'HT-07', time: '13:40 UTC', acknowledged: true },
  { id: 'a9', severity: 'critical', code: 'FUEL-01', title: 'Fuel below 25% reserve threshold', category: 'Fuel', unit: 'HT-07', time: '13:50 UTC', acknowledged: false },
  { id: 'a10', severity: 'info', code: 'RD-02', title: 'Haul Road north interchange congestion cleared', category: 'Production', time: '13:40 UTC', acknowledged: true },
];

export const DISPATCH_QUEUE: DispatchJob[] = [
  { id: 'D-901', truck: 'HT-11', excavator: 'EX-01', loadPoint: 'Face C', dumpPoint: 'Crusher Pad', priority: 'High', status: 'Queued', assignedAt: '14:30 UTC', etaMin: 6 },
  { id: 'D-900', truck: 'HT-04', excavator: 'EX-01', loadPoint: 'Face C', dumpPoint: 'Crusher Pad', priority: 'Normal', status: 'Active', assignedAt: '14:12 UTC', etaMin: 4 },
  { id: 'D-899', truck: 'HT-06', excavator: 'EX-03', loadPoint: 'Face B', dumpPoint: 'Dump East', priority: 'Normal', status: 'Active', assignedAt: '14:08 UTC', etaMin: 2 },
  { id: 'D-898', truck: 'HT-09', excavator: 'EX-03', loadPoint: 'Face B', dumpPoint: 'Dump East', priority: 'Low', status: 'Completed', assignedAt: '13:40 UTC', etaMin: 0 },
  { id: 'D-897', truck: 'HT-11', excavator: 'EX-01', loadPoint: 'Face C', dumpPoint: 'Crusher Pad', priority: 'Normal', status: 'Completed', assignedAt: '13:10 UTC', etaMin: 0 },
  { id: 'D-896', truck: 'WT-03', excavator: '—', loadPoint: 'Fill Station', dumpPoint: 'Haul Road N', priority: 'Low', status: 'Active', assignedAt: '13:55 UTC', etaMin: 12 },
];

export const HOURLY_PRODUCTION: ProductionPoint[] = [
  { label: '08:00', actual: 3200, target: 3600 },
  { label: '09:00', actual: 3800, target: 3600 },
  { label: '10:00', actual: 4100, target: 3600 },
  { label: '11:00', actual: 3900, target: 3600 },
  { label: '12:00', actual: 3500, target: 3600 },
  { label: '13:00', actual: 4300, target: 3600 },
  { label: '14:00', actual: 4000, target: 3600 },
  { label: '15:00', actual: 2100, target: 3600 },
];

export const DAILY_PRODUCTION: ProductionPoint[] = [
  { label: 'Mon', actual: 38500, target: 40000 },
  { label: 'Tue', actual: 41200, target: 40000 },
  { label: 'Wed', actual: 39800, target: 40000 },
  { label: 'Thu', actual: 42500, target: 40000 },
  { label: 'Fri', actual: 40100, target: 40000 },
  { label: 'Sat', actual: 36200, target: 36000 },
  { label: 'Sun', actual: 0, target: 0 },
];

export const DASHBOARD_KPIS: KpiMetric[] = [
  { id: 'prod', label: 'PRODUCTION TODAY', value: '42,500', unit: 't', trend: 6.2, prevShift: '40,100 t', status: 'good', statusLabel: 'Above target', lastUpdated: '14:38 UTC', tooltip: 'Wet metric tonnes tipped this shift vs plan.', accent: 'cyan' },
  { id: 'target', label: 'TARGET ACHIEVEMENT', value: 106.3, unit: '%', trend: 4.1, prevShift: '100.2%', status: 'good', statusLabel: 'On track', lastUpdated: '14:38 UTC', tooltip: 'Actual / planned production for active shift.', accent: 'green' },
  { id: 'util', label: 'FLEET UTILIZATION', value: 81, unit: '%', trend: -1.4, prevShift: '83%', status: 'watch', statusLabel: 'Watch', lastUpdated: '14:37 UTC', tooltip: 'Working time / available time across active assets.', accent: 'amber' },
  { id: 'avail', label: 'AVAILABILITY', value: 91, unit: '%', trend: 0.8, prevShift: '90%', status: 'good', statusLabel: 'Healthy', lastUpdated: '14:37 UTC', tooltip: 'Assets not in maintenance or breakdown.', accent: 'cyan' },
  { id: 'fuel', label: 'FUEL CONSUMPTION', value: '18,240', unit: 'L/h', trend: 3.5, prevShift: '17,600 L/h', status: 'watch', statusLabel: 'Elevated', lastUpdated: '14:36 UTC', tooltip: 'Site-wide fuel burn rate for the shift.', accent: 'amber' },
  { id: 'cycle', label: 'AVG CYCLE TIME', value: 18.6, unit: 'min', trend: -2.1, prevShift: '19.0 min', status: 'good', statusLabel: 'Improving', lastUpdated: '14:35 UTC', tooltip: 'Load → haul → dump → return average.', accent: 'cyan' },
  { id: 'payload', label: 'AVG PAYLOAD', value: 178, unit: 't', trend: 1.2, prevShift: '176 t', status: 'good', statusLabel: 'Stable', lastUpdated: '14:35 UTC', tooltip: 'Mean payload for completed haul trips.', accent: 'green' },
  { id: 'down', label: 'DOWNTIME', value: 4.2, unit: 'Hrs', trend: 12.0, prevShift: '3.7 Hrs', status: 'critical', statusLabel: 'Alert', lastUpdated: '14:38 UTC', tooltip: 'Unplanned + planned downtime this shift.', accent: 'red' },
  { id: 'engine', label: 'ENGINE HOURS', value: '1,284', unit: 'h', trend: 0.5, prevShift: '1,210 h', status: 'neutral', statusLabel: 'Shift total', lastUpdated: '14:30 UTC', tooltip: 'Sum of running engine hours this shift.', accent: 'muted' },
  { id: 'trips', label: 'TRIPS TODAY', value: 186, unit: '', trend: 5.0, prevShift: '177', status: 'good', statusLabel: 'Ahead', lastUpdated: '14:38 UTC', tooltip: 'Completed dump cycles across haul fleet.', accent: 'cyan' },
  { id: 'safety', label: 'SAFETY ALERTS', value: 3, unit: 'open', trend: 0, prevShift: '2 open', status: 'critical', statusLabel: 'Action needed', lastUpdated: '14:22 UTC', tooltip: 'Unacknowledged critical/warning safety events.', accent: 'red' },
  { id: 'eff', label: 'OPERATING EFFICIENCY', value: 91.4, unit: '%', trend: 1.1, prevShift: '90.1%', status: 'good', statusLabel: 'Strong', lastUpdated: '14:38 UTC', tooltip: 'Composite efficiency across load & haul.', accent: 'cyan' },
];

export const NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: 'Critical engine fault', body: 'HT-14 immobilized — recovery crew dispatched.', time: '2m ago', read: false, severity: 'critical' },
  { id: 'n2', title: 'Fuel burn anomaly', body: 'HT-04 above shift baseline by 8%.', time: '12m ago', read: false, severity: 'warning' },
  { id: 'n3', title: 'Dispatch queue', body: 'HT-11 staged for Face C assignment.', time: '18m ago', read: false, severity: 'info' },
  { id: 'n4', title: 'Service completed', body: 'DR-05 compressor WO-2405 closed.', time: '1h ago', read: true, severity: 'info' },
  { id: 'n5', title: 'Shift production', body: 'Target crossed 100% at 13:52 UTC.', time: '46m ago', read: true, severity: 'info' },
];

export const EQUIPMENT_COUNTS = {
  active: FLEET.filter((f) => ['Active', 'Loading', 'Hauling', 'Dumping'].includes(f.status)).length,
  idle: FLEET.filter((f) => ['Idle', 'Waiting'].includes(f.status)).length,
  maintenance: FLEET.filter((f) => f.status === 'Maintenance').length,
  breakdown: FLEET.filter((f) => f.status === 'Breakdown').length,
  offline: FLEET.filter((f) => f.status === 'Offline' || f.connectivity === 'Offline').length,
};
