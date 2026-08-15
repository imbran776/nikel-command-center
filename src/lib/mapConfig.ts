/**
 * Map configuration for the Mining Command FMS Live Map.
 *
 * Defines:
 * - Mine site center coordinates (Pit North Concession Area, Kalimantan)
 * - Conversion utilities from legacy mapXY (0–100) to lat/lng
 * - Tile layer definitions (Satellite, Dark, Standard)
 * - Pit zone polygon coordinates
 * - Haul road polyline coordinates
 */
import L from 'leaflet';
import type { LatLngExpression, LatLngTuple } from 'leaflet';

/* ────────────────────────────────────────────────────────────
 * Fix Leaflet Default Icon 404s in Vite / SPA
 * ──────────────────────────────────────────────────────────── */
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
} catch {
  // Ignore in SSR
}

/* ────────────────────────────────────────────────────────────
 * Mine Site Center & Bounds
 * Operational location: Open-pit mine concession (Pit North, Kalimantan)
 * ──────────────────────────────────────────────────────────── */

export const MINE_CENTER: LatLngTuple = [-3.4500, 114.8400];
export const DEFAULT_ZOOM = 15;
export const MIN_ZOOM = 13;
export const MAX_ZOOM = 19;

// The legacy map uses a 0–100 coordinate system for X (east) and Y (south).
const SPREAD_LAT = 0.018; // ~2 km north-south
const SPREAD_LNG = 0.022; // ~2 km east-west

/**
 * Convert legacy mapX/mapY (0–100 percentage) to real LatLng.
 */
export function mapXYToLatLng(mapX: number, mapY: number): LatLngTuple {
  const lat = MINE_CENTER[0] + SPREAD_LAT / 2 - (mapY / 100) * SPREAD_LAT;
  const lng = MINE_CENTER[1] - SPREAD_LNG / 2 + (mapX / 100) * SPREAD_LNG;
  return [lat, lng];
}

/**
 * Convert LatLng back to legacy mapX/mapY (0–100 percentage).
 */
export function latLngToMapXY(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - (MINE_CENTER[1] - SPREAD_LNG / 2)) / SPREAD_LNG) * 100;
  const y = ((MINE_CENTER[0] + SPREAD_LAT / 2 - lat) / SPREAD_LAT) * 100;
  return { x, y };
}

/* ────────────────────────────────────────────────────────────
 * Tile Layer Definitions (Fast, reliable CDN providers)
 * ──────────────────────────────────────────────────────────── */

export interface TileLayerDef {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
}

export const TILE_LAYERS: TileLayerDef[] = [
  {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },
  {
    id: 'dark',
    name: 'Dark Vector',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: ['a', 'b', 'c', 'd'],
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
];

/* ────────────────────────────────────────────────────────────
 * Pit Zone Polygons
 * ──────────────────────────────────────────────────────────── */

export interface PitZoneDef {
  id: string;
  name: string;
  color: string;
  fillOpacity: number;
  coords: LatLngExpression[];
}

export const PIT_ZONE_A: PitZoneDef = {
  id: 'zone-a',
  name: 'Pit Zone A',
  color: '#C48A2A',
  fillOpacity: 0.2,
  coords: [
    mapXYToLatLng(28, 30),
    mapXYToLatLng(45, 28),
    mapXYToLatLng(50, 38),
    mapXYToLatLng(42, 45),
    mapXYToLatLng(30, 42),
  ],
};

export const PIT_ZONE_B: PitZoneDef = {
  id: 'zone-b',
  name: 'Pit Zone B',
  color: '#3AC7A3',
  fillOpacity: 0.2,
  coords: [
    mapXYToLatLng(30, 35),
    mapXYToLatLng(42, 32),
    mapXYToLatLng(48, 42),
    mapXYToLatLng(40, 50),
    mapXYToLatLng(28, 46),
  ],
};

export const PIT_ZONE_C: PitZoneDef = {
  id: 'zone-c',
  name: 'Pit Zone C',
  color: '#1ADBDE',
  fillOpacity: 0.2,
  coords: [
    mapXYToLatLng(26, 50),
    mapXYToLatLng(42, 48),
    mapXYToLatLng(48, 58),
    mapXYToLatLng(45, 68),
    mapXYToLatLng(28, 65),
  ],
};

export const PIT_ZONES: PitZoneDef[] = [PIT_ZONE_A, PIT_ZONE_B, PIT_ZONE_C];

/* ────────────────────────────────────────────────────────────
 * Haul Roads (polylines)
 * ──────────────────────────────────────────────────────────── */

export interface HaulRoadDef {
  id: string;
  name: string;
  color: string;
  dashArray: string;
  coords: LatLngExpression[];
}

export const HAUL_ROADS: HaulRoadDef[] = [
  {
    id: 'hr-main',
    name: 'Main Haul Road',
    color: '#F6A214',
    dashArray: '10 6',
    coords: [
      mapXYToLatLng(18, 55),
      mapXYToLatLng(30, 52),
      mapXYToLatLng(38, 48),
      mapXYToLatLng(46, 44),
      mapXYToLatLng(58, 38),
      mapXYToLatLng(70, 40),
      mapXYToLatLng(82, 36),
    ],
  },
  {
    id: 'hr-north',
    name: 'North Access Road',
    color: '#F6A214',
    dashArray: '8 5',
    coords: [
      mapXYToLatLng(20, 28),
      mapXYToLatLng(35, 25),
      mapXYToLatLng(55, 22),
      mapXYToLatLng(75, 25),
      mapXYToLatLng(85, 30),
    ],
  },
  {
    id: 'hr-south',
    name: 'South Circuit',
    color: '#F6A214',
    dashArray: '8 5',
    coords: [
      mapXYToLatLng(25, 70),
      mapXYToLatLng(40, 72),
      mapXYToLatLng(55, 68),
      mapXYToLatLng(70, 65),
      mapXYToLatLng(80, 60),
    ],
  },
];

/* ────────────────────────────────────────────────────────────
 * Contour rings
 * ──────────────────────────────────────────────────────────── */

export const CONTOUR_RINGS = [
  { center: mapXYToLatLng(48, 48), radiusM: 600 },
  { center: mapXYToLatLng(48, 48), radiusM: 430 },
  { center: mapXYToLatLng(48, 48), radiusM: 260 },
];

/* ────────────────────────────────────────────────────────────
 * Geofence boundary
 * ──────────────────────────────────────────────────────────── */

export const GEOFENCE_COORDS: LatLngExpression[] = [
  mapXYToLatLng(30, 28),
  mapXYToLatLng(70, 26),
  mapXYToLatLng(78, 55),
  mapXYToLatLng(52, 72),
  mapXYToLatLng(28, 58),
];

/* ────────────────────────────────────────────────────────────
 * Pit Zone pin label positions
 * ──────────────────────────────────────────────────────────── */

export const PIT_PINS = [
  { letter: 'B', position: mapXYToLatLng(36, 38) },
  { letter: 'C', position: mapXYToLatLng(34, 62) },
  { letter: 'E', position: mapXYToLatLng(58, 40) },
];

/* ────────────────────────────────────────────────────────────
 * Dump / Load points of interest
 * ──────────────────────────────────────────────────────────── */

export const POINTS_OF_INTEREST = [
  { id: 'crusher', label: 'Crusher Pad', position: mapXYToLatLng(82, 36), type: 'dump' as const },
  { id: 'dump-east', label: 'Dump East', position: mapXYToLatLng(78, 55), type: 'dump' as const },
  { id: 'face-b', label: 'Load Face B', position: mapXYToLatLng(36, 40), type: 'load' as const },
  { id: 'face-c', label: 'Load Face C', position: mapXYToLatLng(34, 60), type: 'load' as const },
  { id: 'maintenance', label: 'Maintenance Yard', position: mapXYToLatLng(82, 78), type: 'facility' as const },
  { id: 'staging', label: 'Staging Pad', position: mapXYToLatLng(70, 42), type: 'facility' as const },
];
