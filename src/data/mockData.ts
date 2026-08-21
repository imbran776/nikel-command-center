/** Dashboard map/telemetry fixtures — map stays static for now */
import type {
  EquipmentRow,
  ExcavatorListItem,
  HaulTruckListItem,
  LegendItem,
  ProductionBar,
  TelemetryKpi,
  VehicleMarker,
} from '../types/fms';
import { FLEET } from './enterprise';

export const INITIAL_KPIS: TelemetryKpi[] = [
  {
    id: 'fuel',
    label: 'FUEL USAGE',
    value: 84,
    unit: '%',
    subtitle: '18,240L/h',
    accent: 'amber',
    gaugePercent: 84,
    valueColor: 'white',
    subtitleColor: 'amber',
  },
  {
    id: 'efficiency',
    label: 'OPERATING EFFICIENCY',
    value: 91.4,
    unit: '%',
    decimals: 1,
    subtitle: '',
    accent: 'cyan',
    gaugePercent: 91.4,
    valueColor: 'white',
  },
  {
    id: 'fuel_secondary',
    label: 'FUEL USAGE',
    value: 91.4,
    unit: '%',
    decimals: 1,
    subtitle: '',
    accent: 'cyan',
    warning: true,
    gaugePercent: 91.4,
    valueColor: 'white',
  },
  {
    id: 'downtime',
    label: 'DOWNTIME',
    value: 4.2,
    unit: 'Hrs',
    decimals: 1,
    subtitle: 'Alert',
    accent: 'amber',
    warning: true,
    gaugePercent: 12,
    valueColor: 'amber',
    subtitleColor: 'amber',
  },
];

import { mapXYToLatLng } from '../lib/mapConfig';

export const INITIAL_VEHICLES: VehicleMarker[] = [
  {
    id: 'v-ht-04',
    type: 'haul',
    label: 'HT-04',
    detail: 'Op: L. Wang · Hauling',
    x: 62,
    y: 36,
    lat: mapXYToLatLng(62, 36)[0],
    lng: mapXYToLatLng(62, 36)[1],
    trail: [
      { lat: mapXYToLatLng(82, 36)[0], lng: mapXYToLatLng(82, 36)[1] },
      { lat: mapXYToLatLng(76, 38)[0], lng: mapXYToLatLng(76, 38)[1] },
      { lat: mapXYToLatLng(70, 40)[0], lng: mapXYToLatLng(70, 40)[1] },
      { lat: mapXYToLatLng(66, 37)[0], lng: mapXYToLatLng(66, 37)[1] },
      { lat: mapXYToLatLng(62, 36)[0], lng: mapXYToLatLng(62, 36)[1] },
    ],
  },
  {
    id: 'v-ex-01',
    type: 'excavator',
    label: 'EX-01',
    detail: 'Op: R. Chen · Loading',
    x: 54,
    y: 74,
    lat: mapXYToLatLng(54, 74)[0],
    lng: mapXYToLatLng(54, 74)[1],
    trail: [
      { lat: mapXYToLatLng(34, 60)[0], lng: mapXYToLatLng(34, 60)[1] },
      { lat: mapXYToLatLng(42, 66)[0], lng: mapXYToLatLng(42, 66)[1] },
      { lat: mapXYToLatLng(48, 70)[0], lng: mapXYToLatLng(48, 70)[1] },
      { lat: mapXYToLatLng(54, 74)[0], lng: mapXYToLatLng(54, 74)[1] },
    ],
  },
  {
    id: 'v-ht-06',
    type: 'haul',
    label: 'HT-06',
    detail: 'Op: M. Okonkwo · Loading',
    x: 38,
    y: 40,
    lat: mapXYToLatLng(38, 40)[0],
    lng: mapXYToLatLng(38, 40)[1],
    trail: [
      { lat: mapXYToLatLng(30, 42)[0], lng: mapXYToLatLng(30, 42)[1] },
      { lat: mapXYToLatLng(35, 41)[0], lng: mapXYToLatLng(35, 41)[1] },
      { lat: mapXYToLatLng(38, 40)[0], lng: mapXYToLatLng(38, 40)[1] },
    ],
  },
  {
    id: 'v-ht-09',
    type: 'haul',
    label: 'HT-09',
    detail: 'Op: S. Chen · Dumping',
    x: 74,
    y: 48,
    lat: mapXYToLatLng(74, 48)[0],
    lng: mapXYToLatLng(74, 48)[1],
    trail: [
      { lat: mapXYToLatLng(65, 45)[0], lng: mapXYToLatLng(65, 45)[1] },
      { lat: mapXYToLatLng(70, 46)[0], lng: mapXYToLatLng(70, 46)[1] },
      { lat: mapXYToLatLng(74, 48)[0], lng: mapXYToLatLng(74, 48)[1] },
    ],
  },
  {
    id: 'v-ht-11',
    type: 'haul',
    label: 'HT-11',
    detail: 'Op: J. Martinez · Waiting',
    x: 55,
    y: 55,
    lat: mapXYToLatLng(55, 55)[0],
    lng: mapXYToLatLng(55, 55)[1],
    trail: [
      { lat: mapXYToLatLng(58, 52)[0], lng: mapXYToLatLng(58, 52)[1] },
      { lat: mapXYToLatLng(55, 55)[0], lng: mapXYToLatLng(55, 55)[1] },
    ],
  },
  {
    id: 'v-ex-03',
    type: 'excavator',
    label: 'EX-03',
    detail: 'Op: K. Patel · Active',
    x: 36,
    y: 42,
    lat: mapXYToLatLng(36, 42)[0],
    lng: mapXYToLatLng(36, 42)[1],
    trail: [
      { lat: mapXYToLatLng(38, 44)[0], lng: mapXYToLatLng(38, 44)[1] },
      { lat: mapXYToLatLng(36, 42)[0], lng: mapXYToLatLng(36, 42)[1] },
    ],
  },
  {
    id: 'v-dz-01',
    type: 'haul',
    label: 'DZ-01',
    detail: 'Op: P. Ibrahim · Active',
    x: 70,
    y: 52,
    lat: mapXYToLatLng(70, 52)[0],
    lng: mapXYToLatLng(70, 52)[1],
  },
  {
    id: 'v-wt-03',
    type: 'haul',
    label: 'WT-03',
    detail: 'Op: F. Alvarez · Hauling',
    x: 58,
    y: 44,
    lat: mapXYToLatLng(58, 44)[0],
    lng: mapXYToLatLng(58, 44)[1],
  },
];

export const HAUL_TRUCKS: HaulTruckListItem[] = [
  { id: 'HT-04', meta: '500m / Load', mapX: 62, mapY: 36 },
  { id: 'HT-11', meta: '190m / Load', mapX: 70, mapY: 42 },
  { id: 'HT-09', meta: '200m / Load', mapX: 68, mapY: 48 },
];

export const EXCAVATORS: ExcavatorListItem[] = [
  { id: 'EX-03', meta: 'EX-03', mapX: 48, mapY: 58 },
];

export const PIT_ZONE_LEGEND: LegendItem[] = [
  { label: 'Pit Zone A', color: '#C48A2A' },
  { label: 'Pit Zone B', color: '#3AC7A3' },
  { label: 'Pit Zone C', color: '#1ADBDE' },
];

export const PIT_ZONES_LEGEND: LegendItem[] = [
  { label: 'Pit Zone A', color: '#27787A' },
  { label: 'Haul Road', color: '#F6A214' },
  { label: 'Maintenance', color: '#5A636C' },
];

export const INITIAL_EQUIPMENT: EquipmentRow[] = FLEET.slice(0, 6).map((f) => ({
  id: f.id,
  unit: f.unit,
  type: f.type.toUpperCase(),
  status:
    f.status === 'Maintenance'
      ? 'Maintenance'
      : f.status === 'Idle' || f.status === 'Waiting'
        ? 'Idle'
        : f.status === 'Breakdown' || f.status === 'Offline'
          ? 'Offline'
          : 'Active',
  driver: f.operator,
  health: f.health,
}));

/**
 * Grouped dual bars per hour (from reference screenshot):
 * cyan + amber side-by-side under each hour label — NOT stacked.
 * Values sampled to match reference proportions.
 */
export const INITIAL_PRODUCTION: ProductionBar[] = [
  { hour: '08:00', primary: 37000, secondary: 30000 },
  { hour: '09:00', primary: 34000, secondary: 30500 },
  { hour: '10:00', primary: 33000, secondary: 36500 },
  { hour: '11:00', primary: 35000, secondary: 38000 },
  { hour: '12:00', primary: 34000, secondary: 37000 },
  { hour: '13:00', primary: 42000, secondary: 39500 },
  { hour: '14:00', primary: 39500, secondary: 40000 },
  { hour: '15:00', primary: 25000, secondary: 20000 },
];

export const PRODUCTION_TARGET = 40000;
export const PRODUCTION_TOTAL = 42500;
export const X_AXIS_LABELS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
