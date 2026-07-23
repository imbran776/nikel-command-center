export type NavItemId =
  | 'dashboard'
  | 'live-ops'
  | 'dispatch'
  | 'fleet'
  | 'production'
  | 'equipment'
  | 'equipment-detail'
  | 'maintenance'
  | 'fuel'
  | 'spare-parts'
  | 'operators'
  | 'alerts'
  | 'reports'
  | 'analytics'
  | 'users'
  | 'roles'
  | 'settings'
  | 'audit-logs';

export type AssetStatus =
  | 'Active'
  | 'Idle'
  | 'Loading'
  | 'Hauling'
  | 'Dumping'
  | 'Waiting'
  | 'Maintenance'
  | 'Breakdown'
  | 'Offline';

export type AssetType =
  | 'Haul Truck'
  | 'Excavator'
  | 'Loader'
  | 'Dozer'
  | 'Drill Rig'
  | 'Water Truck'
  | 'Grader';

export type EngineState = 'Running' | 'Idle' | 'Off' | 'Fault';
export type Connectivity = 'Online' | 'Degraded' | 'Offline';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type MaintType = 'Preventive' | 'Corrective';
export type WorkOrderStatus = 'Open' | 'In Progress' | 'Parts Hold' | 'Completed' | 'Cancelled';
export type Priority = 'Low' | 'Normal' | 'High' | 'Critical';

export interface MineSite {
  id: string;
  name: string;
  code: string;
}

export interface ShiftInfo {
  id: string;
  code: string;
  label: string;
  start: string;
  end: string;
}

export interface FleetAsset {
  id: string;
  unit: string;
  type: AssetType;
  status: AssetStatus;
  engine: EngineState;
  connectivity: Connectivity;
  operator: string;
  operatorId: string;
  fuelPct: number;
  health: number;
  engineHours: number;
  assignment: string;
  location: string;
  speedKph: number;
  destination: string;
  payloadT: number;
  lastUpdate: string;
  cycleMin: number;
  tripsToday: number;
  availability: number;
  utilization: number;
  mapX: number;
  mapY: number;
}

export interface Operator {
  id: string;
  name: string;
  role: string;
  shift: string;
  assignedUnit: string;
  hoursToday: number;
  attendance: 'On Site' | 'Off' | 'Break' | 'Training';
  performance: number;
  safetyScore: number;
  certifications: string[];
  phone: string;
  licenseExp: string;
}

export interface WorkOrder {
  id: string;
  unit: string;
  type: MaintType;
  title: string;
  status: WorkOrderStatus;
  priority: Priority;
  technician: string;
  parts: string;
  costUsd: number;
  hoursRemaining: number;
  dueDate: string;
  openedAt: string;
}

export interface FuelEvent {
  id: string;
  unit: string;
  liters: number;
  costUsd: number;
  station: string;
  operator: string;
  at: string;
}

export interface OpsAlert {
  id: string;
  severity: AlertSeverity;
  code: string;
  title: string;
  category:
    | 'Overspeed'
    | 'Temperature'
    | 'Fuel'
    | 'Maintenance'
    | 'GPS'
    | 'Engine'
    | 'Comms'
    | 'Safety'
    | 'Production';
  unit?: string;
  time: string;
  acknowledged: boolean;
}

export interface DispatchJob {
  id: string;
  truck: string;
  excavator: string;
  loadPoint: string;
  dumpPoint: string;
  priority: Priority;
  status: 'Queued' | 'Active' | 'Completed' | 'Cancelled';
  assignedAt: string;
  etaMin: number;
}

export interface ProductionPoint {
  label: string;
  actual: number;
  target: number;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend: number;
  prevShift: string;
  status: 'good' | 'watch' | 'critical' | 'neutral';
  statusLabel: string;
  lastUpdated: string;
  tooltip: string;
  accent: 'cyan' | 'amber' | 'green' | 'red' | 'muted';
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  severity: AlertSeverity;
}

/** Legacy dashboard compatibility */
export type EquipmentStatus = 'Active' | 'Idle' | 'Maintenance' | 'Offline';
export type EquipmentRow = {
  id: string;
  unit: string;
  type: string;
  status: EquipmentStatus;
  driver: string;
  health: number;
};

export interface TelemetryKpi {
  id: 'fuel' | 'efficiency' | 'fuel_secondary' | 'downtime';
  label: string;
  value: number;
  unit: string;
  decimals?: number;
  subtitle: string;
  accent: 'amber' | 'cyan';
  warning?: boolean;
  gaugePercent: number;
  valueColor?: 'white' | 'amber';
  subtitleColor?: 'amber' | 'muted';
}

export interface VehicleMarker {
  id: string;
  type: 'haul' | 'excavator';
  label: string;
  detail: string;
  x: number;
  y: number;
  heading?: number;
}

/** Dual-tone hourly bar: cyan (ore) + amber (waste/secondary) stacked per hour */
export interface ProductionBar {
  hour: string;
  /** Cyan segment (e.g. ore tonnes) */
  primary: number;
  /** Amber segment (e.g. waste / secondary) */
  secondary: number;
}

export interface HaulTruckListItem {
  id: string;
  meta: string;
  mapX: number;
  mapY: number;
}

export interface ExcavatorListItem {
  id: string;
  meta: string;
  mapX: number;
  mapY: number;
}

export interface LegendItem {
  label: string;
  color: string;
}
