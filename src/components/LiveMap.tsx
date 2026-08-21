import {
  AlertTriangle,
  ChevronRight,
  CircleDot,
  Crosshair,
  DraftingCompass,
  Eye,
  EyeOff,
  Globe,
  Hexagon,
  Layers,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin as MapPinIcon,
  Maximize2,
  Minimize2,
  Mountain,
  Navigation,
  Pentagon,
  Plus,
  Radio,
  Ruler,
  Satellite,
  Scan,
  Search,
  Smartphone,
  Truck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import AddDeviceModal from './modals/AddDeviceModal';

import L from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useOps } from '../contexts/OpsContext';
import {
  EXCAVATORS,
  HAUL_TRUCKS,
  PIT_ZONE_LEGEND,
  PIT_ZONES_LEGEND,
} from '../data/mockData';
import {
  CONTOUR_RINGS,
  DEFAULT_ZOOM,
  GEOFENCE_COORDS,
  HAUL_ROADS,
  latLngToMapXY,
  mapXYToLatLng,
  MAX_ZOOM,
  MINE_CENTER,
  MIN_ZOOM,
  PIT_PINS,
  PIT_ZONES,
  POINTS_OF_INTEREST,
  TILE_LAYERS,
} from '../lib/mapConfig';
import type { FleetAsset, VehicleMarker } from '../types/fms';
import StatusBadge from './ui/StatusBadge';

/* ─── Props ──────────────────────────────────────────────────── */

interface LiveMapProps {
  vehicles: VehicleMarker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onFocusUnit: (x: number, y: number, id?: string, lat?: number, lng?: number) => void;
  focus: { x: number; y: number; lat?: number; lng?: number } | null;
  expanded?: boolean;
  onAddVehicle?: (v: Omit<VehicleMarker, 'x' | 'y'> & { x?: number; y?: number }) => void;
  mobileGpsActive?: boolean;
  mobileGpsError?: string | null;
  onToggleMobileGps?: () => void;
}

type PanelId = 'layers' | 'fleet' | 'follow' | 'alerts' | 'tools' | null;
type MapTool = 'none' | 'measure' | 'draw' | 'select-zone' | 'inspect';

interface MapLayerState {
  roads: boolean;
  pitZones: boolean;
  benchLevels: boolean;
  haulRoads: boolean;
  geofence: boolean;
  equipmentLabels: boolean;
  contourLines: boolean;
}

interface FleetVis {
  trucks: boolean;
  excavators: boolean;
  dozers: boolean;
  support: boolean;
}

interface AlertLayer {
  warnings: boolean;
  breakdowns: boolean;
  maintenance: boolean;
}

interface OnlineOperatorItem {
  id: string;
  name: string;
  unit: string;
  type: string;
  status: string;
  speedKph: number;
  lat: number;
  lng: number;
  x: number;
  y: number;
  source: 'gps' | 'fleet';
  batteryPct?: number;
}

const DEFAULT_LAYERS: MapLayerState = {
  roads: true,
  pitZones: true,
  benchLevels: true,
  haulRoads: true,
  geofence: false,
  equipmentLabels: true,
  contourLines: true,
};

const DEFAULT_FLEET: FleetVis = {
  trucks: true,
  excavators: true,
  dozers: true,
  support: true,
};

const DEFAULT_ALERTS: AlertLayer = {
  warnings: true,
  breakdowns: true,
  maintenance: true,
};

/* ─── Custom marker icon builders ────────────────────────────── */

function createVehicleIcon(
  type: 'haul' | 'excavator' | 'gps',
  label: string,
  operatorName: string | undefined,
  detail: string,
  showLabels: boolean,
  isActive: boolean,
  isAlert: boolean,
  isOnline: boolean,
): L.DivIcon {
  const color = isAlert
    ? '#D6403E'
    : isActive
      ? '#1ADBDE'
      : type === 'gps'
        ? '#1ADBDE'
        : '#F6A214';

  const pingHtml = (isOnline || isActive || isAlert)
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:1.5px solid ${color};animation:pulse 1.8s infinite;opacity:0.8;pointer-events:none"></div>`
    : '';

  const labelText = operatorName ? `${label} · ${operatorName}` : label;

  const labelHtml = showLabels
    ? `<div style="position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:rgba(13,17,22,0.94);border:1px solid ${color}aa;border-radius:4px;padding:2px 6px;font-size:9.5px;font-weight:700;color:#E8ECEF;white-space:nowrap;pointer-events:none;box-shadow:0 3px 8px rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;gap:4px">
        ${isOnline ? '<span style="width:6px;height:6px;border-radius:50%;background:#3AC7A3;display:inline-block;box-shadow:0 0 5px #3AC7A3"></span>' : ''}
        <span>${labelText}</span>
      </div>`
    : '';

  const html = `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:20px;height:20px;cursor:pointer">
    ${pingHtml}
    <div style="width:11px;height:11px;border-radius:50%;background:${color};border:2px solid #0D1116;box-shadow:0 0 10px ${color}"></div>
    ${labelHtml}
  </div>`;

  return L.divIcon({
    html,
    className: 'leaflet-vehicle-marker-dot',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function createPinIcon(letter: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#0D1116;border:1.5px solid #E8ECEF;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#E8ECEF;font-family:Inter,system-ui,sans-serif">${letter}</div>`,
    className: 'leaflet-pin-marker',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function createPoiIcon(label: string, type: 'dump' | 'load' | 'facility'): L.DivIcon {
  const color = type === 'dump' ? '#D6403E' : type === 'load' ? '#3AC7A3' : '#7A848C';
  return L.divIcon({
    html: `<div style="font-size:8.5px;font-weight:600;color:${color};background:rgba(13,17,22,0.88);border:1px solid ${color}44;border-radius:4px;padding:2px 5px;white-space:nowrap;letter-spacing:0.05em;backdrop-filter:blur(4px)">${label}</div>`,
    className: 'leaflet-poi-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/* ─── Map Controller sub-component (inside MapContainer) ─────── */

function MapController({
  focus,
  followMode,
  setFollowMode,
  selectedId,
  vehicles,
  zoom,
  setZoom,
  mapTool,
  measurePts,
  setMeasurePts,
  pushToast,
  initialOperator,
  onSelectUnit,
}: {
  focus: { x: number; y: number; lat?: number; lng?: number } | null;
  followMode: boolean;
  setFollowMode: (f: boolean) => void;
  selectedId: string | null;
  vehicles: VehicleMarker[];
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  mapTool: MapTool;
  measurePts: { lat: number; lng: number }[];
  setMeasurePts: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }[]>>;
  pushToast: (t: { tone: 'info' | 'success' | 'warning' | 'critical'; title: string; message?: string }) => void;
  initialOperator: OnlineOperatorItem | null;
  onSelectUnit?: (id: string, unit: string) => void;
}) {
  const map = useMap();
  const lastPosRef = useRef<L.LatLngTuple | null>(null);
  const initialCenteredRef = useRef<boolean>(false);

  // Automatically invalidate size on mount & resize to eliminate grey tile glitches
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(container);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, [map]);

  // Sync external zoom changes to map (with float precision guard)
  useEffect(() => {
    const currentZoom = map.getZoom();
    if (Math.abs(currentZoom - zoom) > 0.5) {
      map.setZoom(zoom);
    }
  }, [zoom, map]);

  // Initial Camera focus onto Online Operator
  useEffect(() => {
    if (!initialCenteredRef.current && initialOperator && Number.isFinite(initialOperator.lat) && Number.isFinite(initialOperator.lng)) {
      initialCenteredRef.current = true;
      const targetZoom = Math.max(map.getZoom(), 16);
      map.flyTo([initialOperator.lat, initialOperator.lng], targetZoom, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
      if (onSelectUnit) {
        onSelectUnit(initialOperator.id, initialOperator.unit);
      }
      pushToast({
        tone: 'success',
        title: '🎯 Kamera Terpusat ke Operator Online',
        message: `${initialOperator.name} · Unit ${initialOperator.unit}`,
      });
    }
  }, [initialOperator, map, onSelectUnit, pushToast]);

  // Listen for map zoom & drag events
  useMapEvents({
    zoomend: () => {
      const z = Math.round(map.getZoom());
      setZoom((prev) => (prev !== z ? z : prev));
    },
    dragstart: () => {
      // Auto-pause follow mode if user manually drags/pans the map to prevent camera fighting
      if (followMode) {
        setFollowMode(false);
        pushToast({
          tone: 'info',
          title: 'Follow mode paused',
          message: 'Manual map pan detected.',
        });
      }
    },
    click: (e) => {
      if (mapTool !== 'measure') return;
      const { lat, lng } = e.latlng;
      setMeasurePts((pts) => {
        if (pts.length >= 2) return [{ lat, lng }];
        const next = [...pts, { lat, lng }];
        if (next.length === 2) {
          const distM = Math.round(
            map.distance(
              L.latLng(next[0].lat, next[0].lng),
              L.latLng(next[1].lat, next[1].lng),
            ),
          );
          pushToast({
            tone: 'info',
            title: 'Distance measured',
            message: `≈ ${distM} m`,
          });
        }
        return next;
      });
    },
  });

  // Focus on unit or search location
  useEffect(() => {
    if (focus) {
      const latlng: L.LatLngTuple =
        typeof focus.lat === 'number' && typeof focus.lng === 'number'
          ? [focus.lat, focus.lng]
          : mapXYToLatLng(focus.x, focus.y);
      map.flyTo(latlng, Math.max(map.getZoom(), 16), { duration: 0.8 });
    }
  }, [focus, map]);

  // Smooth Follow mode without camera jitter
  useEffect(() => {
    if (!followMode || !selectedId) {
      lastPosRef.current = null;
      return;
    }
    const v = vehicles.find(
      (x) => x.id === selectedId || x.label === selectedId || `GPS-${x.id}` === selectedId
    );
    if (v) {
      const latlng: L.LatLngTuple =
        v.lat !== undefined && v.lng !== undefined
          ? [v.lat, v.lng]
          : mapXYToLatLng(v.x, v.y);

      // Only move camera if position actually changed (> 1m)
      if (lastPosRef.current) {
        const dLat = Math.abs(lastPosRef.current[0] - latlng[0]);
        const dLng = Math.abs(lastPosRef.current[1] - latlng[1]);
        if (dLat < 0.000001 && dLng < 0.000001) return;
      }

      lastPosRef.current = latlng;
      map.panTo(latlng, { animate: true, duration: 0.4 });
    }
  }, [followMode, selectedId, vehicles, map]);

  return null;
}

/* ─── Location Search Component ─────────────────────────────────── */

function LocationSearch({
  onFlyTo,
}: {
  onFlyTo: (lat: number, lng: number, zoom?: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [open, setOpen] = useState(false);

  const PRESETS = [
    { name: 'Pit North (KalSel)', lat: -3.4500, lng: 114.8400 },
    { name: 'Banjarmasin', lat: -3.3194, lng: 114.5908 },
    { name: 'Samarinda', lat: -0.5022, lng: 117.1536 },
    { name: 'Balikpapan', lat: -1.2379, lng: 116.8529 },
    { name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
  ];

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const coordMatch = val.match(/^([-+]?\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setResults([{ name: `Koordinat: ${lat}, ${lng}`, lat, lng }]);
        setOpen(true);
        return;
      }
    }

    const matchedPresets = PRESETS.filter((p) =>
      p.name.toLowerCase().includes(val.toLowerCase()),
    );

    setResults(matchedPresets);
    setOpen(true);

    if (val.length >= 3) {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=4`,
        );
        if (res.ok) {
          const data = await res.json();
          const geoResults = data.map((item: any) => ({
            name: item.display_name.split(',').slice(0, 2).join(','),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }));

          setResults((prev) => {
            const combined = [...matchedPresets];
            geoResults.forEach((g: any) => {
              if (!combined.some((c) => Math.abs(c.lat - g.lat) < 0.01 && Math.abs(c.lng - g.lng) < 0.01)) {
                combined.push(g);
              }
            });
            return combined;
          });
        }
      } catch {
        // network fallback
      } finally {
        setLoading(false);
      }
    }
  };

  const selectItem = (item: { name: string; lat: number; lng: number }) => {
    setQuery(item.name);
    setOpen(false);
    onFlyTo(item.lat, item.lng, 15);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 rounded-md border border-[#2A3036] bg-[#0D1116] px-2 py-1 text-[10px]">
        <Search className="h-3 w-3 text-[#7A848C]" />
        <input
          id="map-location-search-input"
          name="locationSearch"
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Cari lokasi / Lat, Lng..."
          aria-label="Cari lokasi atau koordinat Lat Lng"
          className="w-24 bg-transparent text-[#E8ECEF] placeholder-[#5A636C] focus:outline-none sm:w-36 text-[10px]"
        />
        {loading && <Loader2 className="h-3 w-3 animate-spin text-[#1ADBDE]" />}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            className="text-[#5A636C] hover:text-[#E8ECEF]"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute right-0 top-full z-[2000] mt-1 w-52 overflow-hidden rounded-md border border-[#2A3036] bg-[#0D1116]/96 shadow-2xl backdrop-blur-md">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lng}-${i}`}
              type="button"
              onClick={() => selectItem(r)}
              className="flex w-full items-center gap-2 border-b border-[#1E242A] px-2.5 py-1.5 text-left text-[10px] text-[#C8D0D6] last:border-0 hover:bg-[#1A2026] hover:text-[#1ADBDE]"
            >
              <MapPinIcon className="h-3 w-3 shrink-0 text-[#F6A214]" />
              <span className="truncate">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main LiveMap Component ─────────────────────────────────── */

/**
 * Live Map Panel — enterprise GIS control surface powered by Leaflet.js.
 * Automatically centers on the active online operator when the map is displayed.
 */
export default function LiveMap({
  vehicles,
  selectedId,
  onSelect,
  onFocusUnit,
  focus,
  expanded = false,
  onAddVehicle,
  mobileGpsActive = false,
  mobileGpsError = null,
  onToggleMobileGps,
}: LiveMapProps) {
  const { fleet, pushToast, openAssetDetail, gpsDevices, resetSingleDeviceTrail } = useOps();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [openPanel, setOpenPanel] = useState<PanelId>(null);
  const [layers, setLayers] = useState<MapLayerState>(DEFAULT_LAYERS);
  const [fleetVis, setFleetVis] = useState<FleetVis>(DEFAULT_FLEET);
  const [alertLayer, setAlertLayer] = useState<AlertLayer>(DEFAULT_ALERTS);
  const [followMode, setFollowMode] = useState(false);
  const [mapTool, setMapTool] = useState<MapTool>('none');
  const [fullscreen, setFullscreen] = useState(false);
  const [inspectUnit, setInspectUnit] = useState<string | null>(null);
  const [measurePts, setMeasurePts] = useState<{ lat: number; lng: number }[]>([]);
  const [activeTile, setActiveTile] = useState('dark');
  const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z)));

  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setFollowMode(false);
    pushToast({ tone: 'info', title: 'Map view reset', message: 'Centered on Pit North default extent.' });
  }, [pushToast]);

  /* ─── Online Operators List ────────────────────────────────── */
  const onlineOperators = useMemo<OnlineOperatorItem[]>(() => {
    const list: OnlineOperatorItem[] = [];
    const seenUnits = new Set<string>();

    // 1. Online GPS Devices (Phones / Beacons)
    gpsDevices
      .filter((d) => d.status === 'online' && Number.isFinite(d.lat) && Number.isFinite(d.lng))
      .forEach((d) => {
        const { x, y } = latLngToMapXY(d.lat, d.lng);
        const unit = d.assetUnit || d.name || 'GPS-UNIT';
        seenUnits.add(unit);
        list.push({
          id: d.id,
          name: d.ownerName || 'Operator GPS',
          unit,
          type: d.platform === 'android' ? 'Android GPS' : d.platform === 'ios' ? 'iOS GPS' : 'GPS Device',
          status: 'Online',
          speedKph: 0,
          lat: d.lat,
          lng: d.lng,
          x,
          y,
          source: 'gps',
          batteryPct: d.batteryPct,
        });
      });

    // 2. Active fleet assets with online connectivity
    fleet
      .filter((f) => f.connectivity === 'Online' && f.operator && f.status !== 'Breakdown' && f.status !== 'Offline')
      .forEach((f) => {
        if (seenUnits.has(f.unit)) return;
        seenUnits.add(f.unit);
        const [lat, lng] = mapXYToLatLng(f.mapX ?? 50, f.mapY ?? 50);
        list.push({
          id: f.id,
          name: f.operator,
          unit: f.unit,
          type: f.type,
          status: f.status,
          speedKph: f.speedKph ?? 0,
          lat: f.lat ?? lat,
          lng: f.lng ?? lng,
          x: f.mapX ?? 50,
          y: f.mapY ?? 50,
          source: 'fleet',
          batteryPct: f.fuelPct,
        });
      });

    return list;
  }, [gpsDevices, fleet]);

  // Primary online operator to focus camera on initial map display
  const primaryOnlineOperator = onlineOperators[0] || null;

  /* ─── Merged Vehicle Markers for Map ────────────────────────── */
  const mergedVehicles = useMemo<VehicleMarker[]>(() => {
    const list: VehicleMarker[] = [];
    const seenIds = new Set<string>();
    const seenLabels = new Set<string>();

    // 1. From GPS devices
    gpsDevices
      .filter((device) => Number.isFinite(device.lat) && Number.isFinite(device.lng))
      .forEach((device) => {
        const { x, y } = latLngToMapXY(device.lat, device.lng);
        const label = device.assetUnit || device.name || 'GPS-DEVICE';
        const id = `GPS-${device.id}`;
        seenIds.add(id);
        seenIds.add(device.id);
        seenLabels.add(label);

        list.push({
          id,
          type: 'gps' as const,
          label,
          detail: `Op: ${device.ownerName || 'Operator'} · ${device.status === 'online' ? 'Live GPS' : 'Offline'} · ±${Math.round(device.accuracyM ?? 0)}m`,
          x,
          y,
          lat: device.lat,
          lng: device.lng,
          trail: device.trail?.map((point) => ({ lat: point.lat, lng: point.lng })),
        });
      });

    // 2. From vehicles prop (dynamic/broadcast vehicles)
    vehicles.forEach((v) => {
      if (!seenIds.has(v.id) && !seenLabels.has(v.label)) {
        seenIds.add(v.id);
        seenLabels.add(v.label);
        list.push(v);
      }
    });

    // 3. From fleet assets with coordinates
    fleet.forEach((f) => {
      if (!seenLabels.has(f.unit) && f.mapX !== undefined && f.mapY !== undefined) {
        seenLabels.add(f.unit);
        const [lat, lng] = mapXYToLatLng(f.mapX, f.mapY);
        list.push({
          id: `fleet-${f.id}`,
          type: f.type === 'Excavator' ? 'excavator' : 'haul',
          label: f.unit,
          detail: `Op: ${f.operator} · ${f.status}`,
          x: f.mapX,
          y: f.mapY,
          lat: f.lat ?? lat,
          lng: f.lng ?? lng,
        });
      }
    });

    return list;
  }, [gpsDevices, vehicles, fleet]);

  const selectedAsset = useMemo<FleetAsset | null>(() => {
    const key = inspectUnit || selectedId;
    if (!key) return null;

    const foundFleet =
      fleet.find((f) => f.unit === key || f.id === key) ??
      fleet.find((f) => {
        const v = mergedVehicles.find((x) => x.id === key || x.label === key);
        return v && f.unit === v.label;
      });

    if (foundFleet) return foundFleet;

    // Fallback synthetic FleetAsset for GPS HP / Mobile Devices
    const v = mergedVehicles.find(
      (x) => x.id === key || x.label === key || `GPS-${x.id}` === key || x.id.endsWith(key)
    );

    if (v) {
      const dev = gpsDevices.find(
        (d) => d.id === v.id || d.assetUnit === v.label || d.name === v.label || `GPS-${d.id}` === key
      );
      return {
        id: v.id,
        unit: v.label,
        type: 'Mobile GPS Transmitter',
        status: (dev?.status === 'online' ? 'Active' : 'Idle') as any,
        operator: dev?.ownerName || 'Operator HP',
        speedKph: 0,
        payloadT: 0,
        fuelPct: dev?.batteryPct ?? 98,
        health: 100,
        engine: 'Online',
        assignment: 'Field Telemetry',
        destination: 'Live Tracking',
        lastUpdate: dev?.lastSeen ? new Date(dev.lastSeen).toLocaleTimeString() : 'Baru saja',
        mapX: v.x ?? 50,
        mapY: v.y ?? 50,
        location: 'Pit Area',
        lat: v.lat,
        lng: v.lng,
        connectivity: 'Online',
        operatorId: 'OP-MOBILE',
        engineHours: 0,
        cycleMin: 0,
        tripsToday: 0,
        availability: 100,
        utilization: 100,
        speedLimit: 40,
        speedAlert: false,
        haulerCycleStage: 'Lokal',
      } as FleetAsset;
    }

    return null;
  }, [inspectUnit, selectedId, fleet, mergedVehicles, gpsDevices]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const togglePanel = (id: PanelId) => {
    setOpenPanel((p) => (p === id ? null : id));
  };

  const resolveAssetForMarker = (v: VehicleMarker): FleetAsset | undefined =>
    fleet.find((f) => f.unit === v.label);

  const resolveGpsDeviceForMarker = (v: VehicleMarker) =>
    gpsDevices.find((d) => d.id === v.id || `GPS-${d.id}` === v.id || d.assetUnit === v.label);

  const showMarker = (v: VehicleMarker) => {
    if (v.type === 'gps') return true;
    const asset = resolveAssetForMarker(v);
    const type = asset?.type ?? (v.type === 'excavator' ? 'Excavator' : 'Haul Truck');
    if (type === 'Haul Truck' || type === 'Water Truck') return fleetVis.trucks;
    if (type === 'Excavator' || type === 'Loader') return fleetVis.excavators;
    if (type === 'Dozer' || type === 'Grader') return fleetVis.dozers;
    return fleetVis.support;
  };

  const alertHighlight = (asset?: FleetAsset) => {
    if (!asset) return false;
    if (alertLayer.breakdowns && asset.status === 'Breakdown') return true;
    if (alertLayer.maintenance && asset.status === 'Maintenance') return true;
    if (alertLayer.warnings && (asset.health < 70 || asset.fuelPct < 30 || asset.connectivity !== 'Online'))
      return true;
    return false;
  };

  const openUnit = (unit: string, x: number, y: number, id?: string) => {
    onSelect(id ?? unit);
    onFocusUnit(x, y, id ?? unit);
    setInspectUnit(unit);
    setOpenPanel(null);
  };

  const currentTile = TILE_LAYERS.find((t) => t.id === activeTile) ?? TILE_LAYERS[0];

  const mapBody = (
    <div
      ref={mapContainerRef}
      className={`flex min-h-0 flex-col overflow-hidden border border-[#2A3036] bg-[#12171C] ${
        fullscreen
          ? 'h-full rounded-none border-0'
          : expanded
            ? 'h-full flex-1 rounded-xl'
            : 'flex-[1.55] rounded-xl'
      }`}
    >
      {/* Header strip */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#1E242A] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold tracking-[0.14em] text-[#C8D0D6]">
            LIVE MAP PANEL
          </h3>
          <span className="flex items-center gap-1 rounded bg-[#1A2A28] px-1.5 py-0.5 text-[9px] tracking-wider text-[#3AC7A3]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3AC7A3]" />
            LIVE
          </span>
          {onlineOperators.length > 0 && (
            <span className="flex items-center gap-1 rounded border border-[#3AC7A3]/40 bg-[#1A2A28] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#3AC7A3]">
              <Users className="h-3 w-3" />
              {onlineOperators.length} OPERATOR ONLINE
            </span>
          )}
          {mobileGpsActive && (
            <span className="flex items-center gap-1 rounded border border-[#1ADBDE]/40 bg-[#1ADBDE]/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#1ADBDE]">
              <Smartphone className="h-3 w-3" />
              HP GPS LIVE
            </span>
          )}
          {mapTool !== 'none' && (
            <span className="rounded bg-[#1A2428] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#F6A214]">
              TOOL · {mapTool.replace('-', ' ').toUpperCase()}
            </span>
          )}
          {followMode && (
            <span className="rounded bg-[#1A2428] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#1ADBDE]">
              FOLLOW
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-[#5A636C]">
          {/* Location Search Bar */}
          <LocationSearch
            onFlyTo={(lat, lng) => onFocusUnit(50, 50, 'search', lat, lng)}
          />

          {/* Button Tambah Perangkat / GPS HP */}
          <button
            type="button"
            onClick={() => setAddDeviceModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-[#1ADBDE]/40 bg-[#1ADBDE]/10 px-2 py-1 text-[10px] font-semibold text-[#1ADBDE] hover:bg-[#1ADBDE] hover:text-[#0D1116] transition-colors"
          >
            <Plus className="h-3 w-3" />
            <Smartphone className="h-3 w-3" />
            <span className="hidden sm:inline">+ Perangkat / GPS HP</span>
          </button>

          {/* Tile layer switcher badges */}
          <div className="hidden items-center gap-1 md:flex">
            {TILE_LAYERS.map((tl) => (
              <button
                key={tl.id}
                type="button"
                onClick={() => setActiveTile(tl.id)}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${
                  activeTile === tl.id
                    ? 'bg-[#1A2A2C] text-[#1ADBDE]'
                    : 'text-[#5A636C] hover:bg-[#1A2026] hover:text-[#C8D0D6]'
                }`}
              >
                {tl.id === 'satellite' && <Satellite className="h-3 w-3" />}
                {tl.id === 'osm' && <MapIcon className="h-3 w-3" />}
                {tl.id === 'dark' && <Globe className="h-3 w-3" />}
                {tl.name}
              </button>
            ))}
          </div>
          {fullscreen && (
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="inline-flex items-center gap-1 rounded-md border border-[#2A3036] bg-[#1A2026] px-2 py-1 text-[10px] font-semibold text-[#C8D0D6] hover:border-[#1ADBDE]/50 hover:text-[#1ADBDE]"
            >
              <Minimize2 className="h-3 w-3" /> Exit fullscreen
            </button>
          )}
        </div>
      </div>

      {/* Map area */}
      <div className={`relative mx-2 mb-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-[#2A3036]/60 ${
        mapTool === 'measure' ? 'cursor-crosshair' : ''
      }`}>
        <MapContainer
          center={
            primaryOnlineOperator && Number.isFinite(primaryOnlineOperator.lat) && Number.isFinite(primaryOnlineOperator.lng)
              ? [primaryOnlineOperator.lat, primaryOnlineOperator.lng]
              : MINE_CENTER
          }
          zoom={primaryOnlineOperator ? 16 : DEFAULT_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomControl={false}
          attributionControl={true}
          style={{ width: '100%', height: '100%', background: '#0d1116' }}
        >
          {/* Tile Layer */}
          <TileLayer
            key={currentTile.id}
            url={currentTile.url}
            attribution={currentTile.attribution}
            maxZoom={currentTile.maxZoom}
          />

          {/* Map Controller (auto-focus online operator, zoom sync, follow, measure clicks) */}
          <MapController
            focus={focus}
            followMode={followMode}
            setFollowMode={setFollowMode}
            selectedId={selectedId}
            vehicles={mergedVehicles}
            zoom={zoom}
            setZoom={setZoom}
            mapTool={mapTool}
            measurePts={measurePts}
            setMeasurePts={setMeasurePts}
            pushToast={pushToast}
            initialOperator={primaryOnlineOperator}
            onSelectUnit={(id, unit) => {
              onSelect(id);
              setInspectUnit(unit);
            }}
          />

          {/* Contour lines */}
          {layers.contourLines &&
            CONTOUR_RINGS.map((ring, i) => (
              <Circle
                key={`contour-${i}`}
                center={ring.center as L.LatLngExpression}
                radius={ring.radiusM}
                pathOptions={{
                  color: '#5A636C',
                  weight: 1,
                  opacity: 0.35,
                  fill: false,
                }}
              />
            ))}

          {/* Bench levels hatch pattern */}
          {layers.benchLevels && (
            <Circle
              center={CONTOUR_RINGS[1].center as L.LatLngExpression}
              radius={CONTOUR_RINGS[1].radiusM}
              pathOptions={{
                color: '#4A5258',
                weight: 0.5,
                opacity: 0.4,
                fillColor: '#4A5258',
                fillOpacity: 0.08,
                dashArray: '4 4',
              }}
            />
          )}

          {/* Geofence boundary */}
          {layers.geofence && (
            <Polygon
              positions={GEOFENCE_COORDS}
              pathOptions={{
                color: '#1ADBDE',
                weight: 2,
                opacity: 0.85,
                dashArray: '8 5',
                fill: false,
              }}
            />
          )}

          {/* Pit Zones */}
          {layers.pitZones &&
            PIT_ZONES.map((zone) => (
              <Polygon
                key={zone.id}
                positions={zone.coords}
                pathOptions={{
                  color: zone.color,
                  weight: 2,
                  opacity: 0.8,
                  fillColor: zone.color,
                  fillOpacity: zone.fillOpacity,
                }}
              />
            ))}

          {/* Pit Zone pins */}
          {layers.pitZones &&
            PIT_PINS.map((pin) => (
              <Marker
                key={`pin-${pin.letter}`}
                position={pin.position as L.LatLngExpression}
                icon={createPinIcon(pin.letter)}
              />
            ))}

          {/* Haul Roads */}
          {layers.haulRoads &&
            HAUL_ROADS.map((road) => (
              <Polyline
                key={road.id}
                positions={road.coords}
                pathOptions={{
                  color: road.color,
                  weight: 2.5,
                  opacity: 0.55,
                  dashArray: road.dashArray,
                }}
              />
            ))}

          {/* Points of Interest */}
          {layers.equipmentLabels &&
            POINTS_OF_INTEREST.map((poi) => (
              <Marker
                key={poi.id}
                position={poi.position as L.LatLngExpression}
                icon={createPoiIcon(poi.label, poi.type)}
              />
            ))}

          {/* Motion Trail Polylines (Jalur Pergerakan) */}
          {mergedVehicles.filter(showMarker).map((v) => {
            if (!v.trail || v.trail.length < 2) return null;

            const cleanSegments: L.LatLngTuple[][] = [];
            let currentSegment: L.LatLngTuple[] = [];

            for (let i = 0; i < v.trail.length; i++) {
              const pt = v.trail[i];
              if (!pt || !Number.isFinite(pt.lat) || !Number.isFinite(pt.lng)) continue;

              if (currentSegment.length === 0) {
                currentSegment.push([pt.lat, pt.lng]);
              } else {
                const prev = currentSegment[currentSegment.length - 1];
                const distLat = Math.abs(prev[0] - pt.lat);
                const distLng = Math.abs(prev[1] - pt.lng);

                if (distLat < 0.05 && distLng < 0.05) {
                  currentSegment.push([pt.lat, pt.lng]);
                } else {
                  if (currentSegment.length >= 2) {
                    cleanSegments.push(currentSegment);
                  }
                  currentSegment = [[pt.lat, pt.lng]];
                }
              }
            }
            if (currentSegment.length >= 2) {
              cleanSegments.push(currentSegment);
            }

            const trailColor = v.type === 'gps' ? '#1ADBDE' : v.type === 'excavator' ? '#3AC7A3' : '#F6A214';

            return cleanSegments.map((segment, segIdx) => (
              <Polyline
                key={`trail-${v.id}-${segIdx}`}
                positions={segment}
                pathOptions={{
                  color: trailColor,
                  weight: 2.5,
                  opacity: 0.8,
                  dashArray: '4 4',
                }}
              />
            ));
          })}

          {/* Vehicle Markers */}
          {mergedVehicles.filter(showMarker).map((v) => {
            const asset = resolveAssetForMarker(v);
            const gpsDev = resolveGpsDeviceForMarker(v);
            const hot = alertHighlight(asset);
            const active = selectedId === v.id || inspectUnit === v.label;
            const operatorName = asset?.operator || gpsDev?.ownerName;
            const isOnline = asset?.connectivity === 'Online' || gpsDev?.status === 'online';
            const pos: L.LatLngTuple =
              v.lat !== undefined && v.lng !== undefined
                ? [v.lat, v.lng]
                : mapXYToLatLng(v.x, v.y);

            return (
              <Marker
                key={v.id}
                position={pos}
                icon={createVehicleIcon(
                  v.type,
                  v.label,
                  operatorName,
                  v.detail,
                  layers.equipmentLabels,
                  active,
                  hot,
                  isOnline,
                )}
                eventHandlers={{
                  click: () => openUnit(v.label, v.x, v.y, v.id),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.96}>
                  <div className="rounded bg-[#0D1116]/95 px-2 py-1.5 text-[10px] text-[#E8ECEF] shadow-xl">
                    <div className="flex items-center gap-1 font-bold text-[#1ADBDE]">
                      <span>{v.label}</span>
                      <span className="text-[9px] text-[#8A949C]">({asset?.type || (v.type === 'gps' ? 'GPS HP' : 'Fleet')})</span>
                    </div>
                    {operatorName && (
                      <div className="mt-0.5 text-[#C8D0D6]">
                        <span className="text-[#7A848C]">Operator:</span> <strong className="text-white">{operatorName}</strong>
                      </div>
                    )}
                    {asset?.status && (
                      <div className="text-[9px] text-[#8A949C]">
                        Status: <span className="font-semibold text-[#3AC7A3]">{asset.status}</span> · {asset.speedKph ?? 0} kph
                      </div>
                    )}
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

          {/* Measure line */}
          {measurePts.length > 0 && (
            <>
              {measurePts.length === 2 && (
                <Polyline
                  positions={measurePts.map((p) => [p.lat, p.lng] as L.LatLngTuple)}
                  pathOptions={{
                    color: '#1ADBDE',
                    weight: 2,
                    dashArray: '6 4',
                  }}
                />
              )}
              {measurePts.map((p, i) => (
                <Circle
                  key={`mpt-${i}`}
                  center={[p.lat, p.lng]}
                  radius={10}
                  pathOptions={{
                    color: '#1ADBDE',
                    fillColor: '#1ADBDE',
                    fillOpacity: 1,
                    weight: 0,
                  }}
                />
              ))}
            </>
          )}
        </MapContainer>

        {/* ─── Overlay UI: Online Operators Pill Bar ─── */}
        {onlineOperators.length > 0 && (
          <div className="pointer-events-auto absolute left-2 top-2 z-[1000] flex max-w-[calc(100%-80px)] flex-wrap items-center gap-1.5 rounded-lg border border-[#1ADBDE]/35 bg-[#0D1116]/95 p-1.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-[#1ADBDE]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3AC7A3] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3AC7A3]"></span>
              </span>
              <span className="hidden sm:inline">OPERATOR ONLINE ({onlineOperators.length})</span>
              <span className="sm:hidden">ONLINE ({onlineOperators.length})</span>
            </div>

            <div className="flex max-w-full items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
              {onlineOperators.slice(0, 6).map((op) => {
                const isSelected = selectedId === op.id || selectedId === op.unit || inspectUnit === op.unit;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      openUnit(op.unit, op.x, op.y, op.id);
                      onFocusUnit(op.x, op.y, op.id, op.lat, op.lng);
                    }}
                    className={`flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#1ADBDE] text-[#0D1116] shadow-sm font-bold'
                        : 'border border-[#2A3036] bg-[#161C22] text-[#C8D0D6] hover:border-[#1ADBDE]/50 hover:bg-[#1E262E] hover:text-[#1ADBDE]'
                    }`}
                  >
                    <span className="font-bold">{op.unit}</span>
                    <span className="text-[9px] opacity-80">({op.name})</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              title="Arahkan kamera ke operator utama"
              onClick={() => {
                if (primaryOnlineOperator) {
                  openUnit(
                    primaryOnlineOperator.unit,
                    primaryOnlineOperator.x,
                    primaryOnlineOperator.y,
                    primaryOnlineOperator.id,
                  );
                  onFocusUnit(
                    primaryOnlineOperator.x,
                    primaryOnlineOperator.y,
                    primaryOnlineOperator.id,
                    primaryOnlineOperator.lat,
                    primaryOnlineOperator.lng,
                  );
                  pushToast({
                    tone: 'success',
                    title: 'Kamera terpusat',
                    message: `${primaryOnlineOperator.name} (${primaryOnlineOperator.unit})`,
                  });
                }
              }}
              className="flex items-center gap-1 rounded bg-[#1ADBDE]/20 px-2 py-1 text-[10px] font-bold text-[#1ADBDE] hover:bg-[#1ADBDE] hover:text-[#0D1116] transition-colors"
            >
              <LocateFixed className="h-3 w-3" />
              <span>Pusatkan</span>
            </button>
          </div>
        )}

        {/* Left legends */}
        {layers.pitZones && (
          <div className="pointer-events-auto absolute left-2 bottom-2 z-[1000] w-[136px] overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/92 px-2.5 py-1.5 shadow-xl backdrop-blur-sm">
            <div className="mb-1 text-[9px] font-semibold tracking-[0.12em] text-[#7A848C]">
              PIT ZONES
            </div>
            <ul className="space-y-1">
              {PIT_ZONES_LEGEND.map((z) => (
                <li key={z.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: z.color }} />
                  <span className="text-[10px] text-[#C8D0D6]">{z.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fleet lists — right of map, left of toolbar */}
        {fleetVis.trucks && (
          <div className="absolute right-12 top-2 z-[1000] w-[148px] overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/92 shadow-xl backdrop-blur-sm">
            <div className="border-b border-[#2A3036] px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#C8D0D6]">
              HAUL TRUCKS
            </div>
            <ul>
              {HAUL_TRUCKS.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openUnit(t.id, t.mapX, t.mapY, t.id)}
                    className="flex w-full items-center gap-1.5 border-b border-[#1E242A] px-2 py-1.5 text-left last:border-0 hover:bg-[#1A2026]"
                  >
                    <TruckIcon />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-[11px] font-semibold text-[#E8ECEF]">{t.id}</div>
                      <div className="text-[9px] text-[#8A949C]">{t.meta}</div>
                    </div>
                    <ChevronRight className="h-3 w-3 shrink-0 text-[#F6A214]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {fleetVis.excavators && (
          <div className="absolute right-12 top-[148px] z-[1000] w-[148px] overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/92 shadow-xl backdrop-blur-sm">
            <div className="border-b border-[#2A3036] px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#C8D0D6]">
              EXCAVATORS
            </div>
            <ul>
              {EXCAVATORS.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => openUnit(ex.id, ex.mapX, ex.mapY, ex.id)}
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-[#1A2026]"
                  >
                    <ExcavatorIcon />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-[11px] font-semibold text-[#E8ECEF]">{ex.id}</div>
                      <div className="text-[9px] text-[#8A949C]">{ex.meta}</div>
                    </div>
                    <ChevronRight className="h-3 w-3 shrink-0 text-[#F6A214]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Floating equipment info panel */}
        {selectedAsset && inspectUnit && (
          <EquipmentInfoPanel
            asset={selectedAsset}
            onClose={() => {
              setInspectUnit(null);
              setFollowMode(false);
              onSelect(null);
            }}
            onTrack={() => {
              onFocusUnit(
                selectedAsset.mapX ?? 50,
                selectedAsset.mapY ?? 50,
                selectedAsset.unit,
                selectedAsset.lat,
                selectedAsset.lng,
              );
              setFollowMode(true);
              pushToast({
                tone: 'success',
                title: `Tracking ${selectedAsset.unit}`,
                message: `Follow mode armed · Mengikuti operator ${selectedAsset.operator}.`,
              });
            }}
            onDetails={() => openAssetDetail(selectedAsset.id)}
            onResetTrail={() => resetSingleDeviceTrail(selectedAsset.id || selectedAsset.unit)}
          />
        )}

        {/* Right-edge enterprise GIS toolbar */}
        <div
          className="absolute right-1.5 top-1/2 z-[1000] flex -translate-y-1/2 flex-col gap-0.5 rounded-lg border border-[#2A3036] bg-[#0D1116]/95 p-1 shadow-2xl backdrop-blur-md"
        >
          <ToolBtn
            label="Map Layers"
            active={openPanel === 'layers'}
            onClick={() => togglePanel('layers')}
          >
            <Layers className="h-3.5 w-3.5" strokeWidth={1.75} />
          </ToolBtn>
          <ToolBtn
            label="Fleet Visibility"
            active={openPanel === 'fleet'}
            onClick={() => togglePanel('fleet')}
          >
            <Truck className="h-3.5 w-3.5" strokeWidth={1.75} />
          </ToolBtn>
          <ToolBtn
            label="Follow / Center Operator"
            active={openPanel === 'follow' || followMode}
            onClick={() => togglePanel('follow')}
          >
            <LocateFixed className="h-3.5 w-3.5" strokeWidth={1.75} />
          </ToolBtn>
          <ToolBtn
            label="Alert Layer"
            active={openPanel === 'alerts'}
            onClick={() => togglePanel('alerts')}
          >
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
          </ToolBtn>
          <Divider />
          <ToolBtn
            label={fullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
            active={fullscreen}
            onClick={() => {
              setFullscreen((f) => !f);
              setOpenPanel(null);
            }}
          >
            {fullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
          </ToolBtn>
          <ToolBtn
            label="Map Tools"
            active={openPanel === 'tools' || mapTool !== 'none'}
            onClick={() => togglePanel('tools')}
          >
            <DraftingCompass className="h-3.5 w-3.5" strokeWidth={1.75} />
          </ToolBtn>
          <Divider />
          {/* Zoom slider */}
          <div
            className="flex flex-col items-center gap-1 py-1"
            title={`Zoom ${zoom} · slide up/down`}
          >
            <span className="text-[8px] font-semibold tracking-wide text-[#5A636C]">+</span>
            <input
              id="map-zoom-range-slider"
              name="mapZoom"
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={1}
              value={zoom}
              aria-label="Map zoom level"
              onChange={(e) => setZoom(clampZoom(Number(e.target.value)))}
              className="map-zoom-slider h-[88px] w-3 cursor-pointer appearance-none bg-transparent"
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
            />
            <span className="text-[8px] font-semibold tracking-wide text-[#5A636C]">−</span>
            <span className="text-[8px] tabular-nums text-[#6A737C]">z{zoom}</span>
          </div>
        </div>

        {/* Toolbar flyout panels */}
        {openPanel && (
          <div
            className="absolute right-11 top-1/2 z-[1000] w-[210px] -translate-y-1/2 overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/96 shadow-2xl backdrop-blur-md"
          >
            {openPanel === 'layers' && (
              <Flyout title="Map Layers" onClose={() => setOpenPanel(null)}>
                <ToggleRow
                  icon={<Navigation className="h-3.5 w-3.5" />}
                  label="Roads"
                  checked={layers.roads}
                  onChange={(v) => setLayers((s) => ({ ...s, roads: v }))}
                />
                <ToggleRow
                  icon={<Hexagon className="h-3.5 w-3.5" />}
                  label="Pit Zones"
                  checked={layers.pitZones}
                  onChange={(v) => setLayers((s) => ({ ...s, pitZones: v }))}
                />
                <ToggleRow
                  icon={<Mountain className="h-3.5 w-3.5" />}
                  label="Bench Levels"
                  checked={layers.benchLevels}
                  onChange={(v) => setLayers((s) => ({ ...s, benchLevels: v }))}
                />
                <ToggleRow
                  icon={<CircleDot className="h-3.5 w-3.5" />}
                  label="Haul Roads"
                  checked={layers.haulRoads}
                  onChange={(v) => setLayers((s) => ({ ...s, haulRoads: v }))}
                />
                <ToggleRow
                  icon={<Pentagon className="h-3.5 w-3.5" />}
                  label="Geofence"
                  checked={layers.geofence}
                  onChange={(v) => setLayers((s) => ({ ...s, geofence: v }))}
                />
                <ToggleRow
                  icon={<MapPinIcon className="h-3.5 w-3.5" />}
                  label="Equipment Labels"
                  checked={layers.equipmentLabels}
                  onChange={(v) => setLayers((s) => ({ ...s, equipmentLabels: v }))}
                />
                <ToggleRow
                  icon={<Layers className="h-3.5 w-3.5" />}
                  label="Contour Lines"
                  checked={layers.contourLines}
                  onChange={(v) => setLayers((s) => ({ ...s, contourLines: v }))}
                />
                <Divider />
                <div className="px-2.5 py-1.5">
                  <div className="mb-1 text-[9px] font-semibold tracking-[0.12em] text-[#7A848C]">
                    TILE LAYER
                  </div>
                  <div className="space-y-1">
                    {TILE_LAYERS.map((tl) => (
                      <button
                        key={tl.id}
                        type="button"
                        onClick={() => setActiveTile(tl.id)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[11px] transition-colors ${
                          activeTile === tl.id
                            ? 'bg-[#1A2A2C] text-[#1ADBDE]'
                            : 'text-[#C8D0D6] hover:bg-[#1A2026]'
                        }`}
                      >
                        {tl.id === 'satellite' && <Satellite className="h-3 w-3" />}
                        {tl.id === 'osm' && <MapIcon className="h-3 w-3" />}
                        {tl.id === 'dark' && <Globe className="h-3 w-3" />}
                        {tl.name}
                      </button>
                    ))}
                  </div>
                </div>
              </Flyout>
            )}

            {openPanel === 'fleet' && (
              <Flyout title="Fleet Visibility" onClose={() => setOpenPanel(null)}>
                <ToggleRow
                  icon={fleetVis.trucks ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  label="Trucks"
                  checked={fleetVis.trucks}
                  onChange={(v) => setFleetVis((s) => ({ ...s, trucks: v }))}
                />
                <ToggleRow
                  icon={fleetVis.excavators ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  label="Excavators"
                  checked={fleetVis.excavators}
                  onChange={(v) => setFleetVis((s) => ({ ...s, excavators: v }))}
                />
                <ToggleRow
                  icon={fleetVis.dozers ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  label="Dozers"
                  checked={fleetVis.dozers}
                  onChange={(v) => setFleetVis((s) => ({ ...s, dozers: v }))}
                />
                <ToggleRow
                  icon={fleetVis.support ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  label="Support Vehicles"
                  checked={fleetVis.support}
                  onChange={(v) => setFleetVis((s) => ({ ...s, support: v }))}
                />
              </Flyout>
            )}

            {openPanel === 'follow' && (
              <Flyout title="Follow / Center" onClose={() => setOpenPanel(null)}>
                <ActionRow
                  icon={<Crosshair className="h-3.5 w-3.5 text-[#3AC7A3]" />}
                  label="Arahkan ke Operator Online"
                  onClick={() => {
                    if (primaryOnlineOperator) {
                      openUnit(
                        primaryOnlineOperator.unit,
                        primaryOnlineOperator.x,
                        primaryOnlineOperator.y,
                        primaryOnlineOperator.id,
                      );
                      onFocusUnit(
                        primaryOnlineOperator.x,
                        primaryOnlineOperator.y,
                        primaryOnlineOperator.id,
                        primaryOnlineOperator.lat,
                        primaryOnlineOperator.lng,
                      );
                      pushToast({
                        tone: 'success',
                        title: 'Kamera terpusat ke Operator Online',
                        message: `${primaryOnlineOperator.name} (${primaryOnlineOperator.unit})`,
                      });
                    } else {
                      pushToast({ tone: 'warning', title: 'Tidak ada operator online' });
                    }
                    setOpenPanel(null);
                  }}
                />
                <ActionRow
                  icon={<Crosshair className="h-3.5 w-3.5" />}
                  label="Center on selected"
                  onClick={() => {
                    const a = selectedAsset;
                    const v = mergedVehicles.find((x) => x.label === inspectUnit || x.id === selectedId);
                    if (a) onFocusUnit(a.mapX ?? 50, a.mapY ?? 50, a.unit, a.lat, a.lng);
                    else if (v) onFocusUnit(v.x, v.y, v.id, v.lat, v.lng);
                    else pushToast({ tone: 'warning', title: 'No unit selected', message: 'Select equipment on the map first.' });
                    setOpenPanel(null);
                  }}
                />
                <ActionRow
                  icon={<LocateFixed className="h-3.5 w-3.5" />}
                  label={followMode ? 'Stop follow' : 'Follow active operator/vehicle'}
                  onClick={() => {
                    if (!selectedAsset && !selectedId) {
                      pushToast({ tone: 'warning', title: 'Select a vehicle to follow' });
                      return;
                    }
                    setFollowMode((f) => !f);
                    setOpenPanel(null);
                    pushToast({
                      tone: 'info',
                      title: followMode ? 'Follow disabled' : 'Follow enabled',
                      message: 'Camera tracks operator selection.',
                    });
                  }}
                />
                <ActionRow
                  icon={<Navigation className="h-3.5 w-3.5" />}
                  label="Return to default position"
                  onClick={() => {
                    resetView();
                    setOpenPanel(null);
                  }}
                />
              </Flyout>
            )}

            {openPanel === 'alerts' && (
              <Flyout title="Alert Layer" onClose={() => setOpenPanel(null)}>
                <ToggleRow
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-[#F6A214]" />}
                  label="Warnings"
                  checked={alertLayer.warnings}
                  onChange={(v) => setAlertLayer((s) => ({ ...s, warnings: v }))}
                />
                <ToggleRow
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-[#D6403E]" />}
                  label="Breakdowns"
                  checked={alertLayer.breakdowns}
                  onChange={(v) => setAlertLayer((s) => ({ ...s, breakdowns: v }))}
                />
                <ToggleRow
                  icon={<Wrench className="h-3.5 w-3.5 text-[#F6A214]" />}
                  label="Maintenance due"
                  checked={alertLayer.maintenance}
                  onChange={(v) => setAlertLayer((s) => ({ ...s, maintenance: v }))}
                />
                <p className="mt-1 px-2 pb-1 text-[9px] leading-snug text-[#5A636C]">
                  Highlighted units use red ring · live alert feed.
                </p>
              </Flyout>
            )}

            {openPanel === 'tools' && (
              <Flyout title="Map Tools" onClose={() => setOpenPanel(null)}>
                <ActionRow
                  icon={<Ruler className="h-3.5 w-3.5" />}
                  label="Measure Distance"
                  active={mapTool === 'measure'}
                  onClick={() => {
                    setMapTool((t) => (t === 'measure' ? 'none' : 'measure'));
                    setMeasurePts([]);
                    pushToast({
                      tone: 'info',
                      title: 'Measure mode',
                      message: 'Click two points on the map.',
                    });
                  }}
                />
                <ActionRow
                  icon={<Pentagon className="h-3.5 w-3.5" />}
                  label="Draw Area"
                  active={mapTool === 'draw'}
                  onClick={() => {
                    setMapTool((t) => (t === 'draw' ? 'none' : 'draw'));
                    pushToast({
                      tone: 'info',
                      title: 'Draw area',
                      message: 'UI ready · polygon capture enabled.',
                    });
                  }}
                />
                <ActionRow
                  icon={<Hexagon className="h-3.5 w-3.5" />}
                  label="Select Zone"
                  active={mapTool === 'select-zone'}
                  onClick={() => {
                    setMapTool((t) => (t === 'select-zone' ? 'none' : 'select-zone'));
                    pushToast({ tone: 'info', title: 'Zone select', message: 'Click pit pins B / C / E.' });
                  }}
                />
                <ActionRow
                  icon={<Scan className="h-3.5 w-3.5" />}
                  label="Inspection Mode"
                  active={mapTool === 'inspect'}
                  onClick={() => {
                    setMapTool((t) => (t === 'inspect' ? 'none' : 'inspect'));
                    pushToast({
                      tone: 'info',
                      title: 'Inspection mode',
                      message: 'Click equipment for full operational card.',
                    });
                  }}
                />
                <ActionRow
                  icon={<X className="h-3.5 w-3.5" />}
                  label="Clear Selection"
                  onClick={() => {
                    setMapTool('none');
                    setMeasurePts([]);
                    setInspectUnit(null);
                    onSelect(null);
                    setFollowMode(false);
                    setOpenPanel(null);
                    pushToast({ tone: 'info', title: 'Selection cleared' });
                  }}
                />
              </Flyout>
            )}
          </div>
        )}

        {/* Integration strip */}
        <div className="pointer-events-none absolute bottom-2 right-2 z-[1000] hidden rounded border border-[#2A3036]/80 bg-[#0D1116]/85 px-2 py-0.5 text-[8.5px] tracking-wider text-[#7A848C] sm:block">
          MINE GIS · PIT NORTH KALIMANTAN · ONLINE OPERATOR AUTO-TRACK
        </div>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <>
        {/* Keep layout slot so dashboard grid doesn't collapse */}
        <div className="flex min-h-0 flex-[1.55] flex-col overflow-hidden rounded-xl border border-[#2A3036] bg-[#12171C] opacity-40">
          <div className="flex items-center px-3 py-1.5 text-[11px] text-[#5A636C]">
            LIVE MAP · fullscreen active
          </div>
          <div className="min-h-0 flex-1 bg-[#363C41]/40" />
        </div>
        <div className="fixed inset-x-0 bottom-0 top-[56px] z-[60] bg-[#0D1116] p-0">
          {mapBody}
        </div>
        {onAddVehicle && onToggleMobileGps && (
          <AddDeviceModal
            isOpen={addDeviceModalOpen}
            onClose={() => setAddDeviceModalOpen(false)}
            onAddVehicle={onAddVehicle}
            mobileGpsActive={mobileGpsActive}
            mobileGpsError={mobileGpsError}
            onToggleMobileGps={onToggleMobileGps}
          />
        )}
      </>
    );
  }

  return (
    <>
      {mapBody}
      {onAddVehicle && onToggleMobileGps && (
        <AddDeviceModal
          isOpen={addDeviceModalOpen}
          onClose={() => setAddDeviceModalOpen(false)}
          onAddVehicle={onAddVehicle}
          mobileGpsActive={mobileGpsActive}
          mobileGpsError={mobileGpsError}
          onToggleMobileGps={onToggleMobileGps}
        />
      )}
    </>
  );
}

/* ─── Subcomponents ─────────────────────────────────────────────── */

function EquipmentInfoPanel({
  asset,
  onClose,
  onTrack,
  onDetails,
  onResetTrail,
}: {
  asset: FleetAsset;
  onClose: () => void;
  onTrack: () => void;
  onDetails: () => void;
  onResetTrail?: () => void;
}) {
  return (
    <div
      className="absolute bottom-2 left-[148px] z-[1000] w-[275px] max-w-[calc(100%-11rem)] overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/96 shadow-2xl backdrop-blur-md sm:left-36"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between border-b border-[#2A3036] px-3 py-2">
        <div>
          <div className="font-mono text-[13px] font-semibold text-[#E8ECEF]">{asset.unit}</div>
          <div className="text-[10px] text-[#7A848C]">{asset.type}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-[#5A636C] hover:bg-[#252B31] hover:text-[#C8D0D6]"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-1.5 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge value={asset.status} />
          <span className="text-[9px] text-[#5A636C]">{asset.lastUpdate}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
          <Info label="Operator" value={asset.operator || 'Operator Lapangan'} />
          <Info label="Speed" value={`${asset.speedKph} kph`} />
          <Info label="Payload" value={`${asset.payloadT} t`} />
          <Info label="Fuel / Bat" value={`${asset.fuelPct}%`} />
          <Info label="Health" value={`${asset.health}%`} />
          <Info label="Engine" value={asset.engine} />
          <Info label="Assignment" value={asset.assignment} span />
          <Info label="Destination" value={asset.destination} span />
        </dl>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-[#2A3036] bg-[#12171C] px-2.5 py-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onTrack}
            className="flex-1 rounded-md bg-[#1ADBDE] px-2 py-1.5 text-[10px] font-bold text-[#0D1116] hover:bg-[#4AE5E8] transition-colors"
          >
            🎯 Ikuti Operator
          </button>
          <button
            type="button"
            onClick={onDetails}
            className="flex-1 rounded-md border border-[#2A3036] bg-[#1A2026] px-2 py-1.5 text-[10px] font-semibold text-[#C8D0D6] hover:border-[#1ADBDE]/50 hover:text-[#1ADBDE] transition-colors"
          >
            📄 Detail Unit
          </button>
        </div>
        {onResetTrail && (
          <button
            type="button"
            onClick={onResetTrail}
            className="w-full rounded-md border border-[#D6403E]/40 bg-[#D6403E]/10 px-2 py-1 text-[10px] font-semibold text-[#D6403E] hover:bg-[#D6403E] hover:text-white transition-colors"
          >
            🔄 Reset Riwayat Jejak
          </button>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <dt className="text-[9px] tracking-wide text-[#5A636C]">{label}</dt>
      <dd className="truncate font-medium text-[#C8D0D6]">{value}</dd>
    </div>
  );
}

function Flyout({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-[#2A3036] px-2.5 py-1.5">
        <span className="text-[10px] font-semibold tracking-[0.12em] text-[#C8D0D6]">{title}</span>
        <button type="button" onClick={onClose} className="text-[#5A636C] hover:text-[#C8D0D6]" title="Close">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="py-1">{children}</div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-[#1A2026]"
    >
      <span className="text-[#6A737C]">{icon}</span>
      <span className="flex-1 text-[11px] text-[#C8D0D6]">{label}</span>
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          checked ? 'bg-[#1ADBDE]' : 'bg-[#2A323A]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
            checked ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

function ActionRow({
  icon,
  label,
  onClick,
  active,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-[#1A2026] ${
        active ? 'bg-[#1A2428] text-[#1ADBDE]' : 'text-[#C8D0D6]'
      }`}
    >
      <span className={active ? 'text-[#1ADBDE]' : 'text-[#6A737C]'}>{icon}</span>
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

function ToolBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-[#1A2A2C] text-[#1ADBDE]'
          : 'text-[#7A848C] hover:bg-[#252B31] hover:text-[#E8ECEF]'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 my-0.5 h-px bg-[#2A3036]" />;
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-[#F6A214]" fill="currentColor">
      <path d="M1 5h8v5H1V5Zm8 1.5h2.5L13 9v1H9V6.5ZM2.5 11a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm8 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" />
    </svg>
  );
}

function ExcavatorIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-[#F6A214]" fill="currentColor">
      <path d="M2 10h7l1 2H1l1-2Zm1-4h5l1.2 3H2.8L3 6Zm6.5-.5 2.5-3.5h1.2L10.5 6H13l.5 1.5H8.8L9.5 5.5Z" />
      <circle cx="4" cy="13" r="1.1" />
      <circle cx="9" cy="13" r="1.1" />
    </svg>
  );
}
