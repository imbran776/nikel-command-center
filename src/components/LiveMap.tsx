import {
  AlertTriangle,
  ChevronRight,
  CircleDot,
  Crosshair,
  DraftingCompass,
  Eye,
  EyeOff,
  Hexagon,
  Layers,
  LocateFixed,
  MapPin as MapPinIcon,
  Maximize2,
  Minimize2,
  Mountain,
  Navigation,
  Pentagon,
  Ruler,
  Scan,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { useOps } from '../contexts/OpsContext';
import {
  EXCAVATORS,
  HAUL_TRUCKS,
  PIT_ZONE_LEGEND,
  PIT_ZONES_LEGEND,
} from '../data/mockData';
import type { FleetAsset, VehicleMarker } from '../types/fms';
import StatusBadge from './ui/StatusBadge';

interface LiveMapProps {
  vehicles: VehicleMarker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onFocusUnit: (x: number, y: number, id?: string) => void;
  focus: { x: number; y: number } | null;
  expanded?: boolean;
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

/**
 * Live Map Panel — enterprise GIS control surface.
 * Dashboard layout around this component is FINAL; only map UX evolves here.
 * GPS / WebSocket / replay hooks are UI-ready but not live yet.
 */
export default function LiveMap({
  vehicles,
  selectedId,
  onSelect,
  onFocusUnit,
  focus,
  expanded = false,
}: LiveMapProps) {
  const { fleet, pushToast, openAssetDetail } = useOps();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [openPanel, setOpenPanel] = useState<PanelId>(null);
  const [layers, setLayers] = useState<MapLayerState>(DEFAULT_LAYERS);
  const [fleetVis, setFleetVis] = useState<FleetVis>(DEFAULT_FLEET);
  const [alertLayer, setAlertLayer] = useState<AlertLayer>(DEFAULT_ALERTS);
  const [followMode, setFollowMode] = useState(false);
  const [mapTool, setMapTool] = useState<MapTool>('none');
  const [fullscreen, setFullscreen] = useState(false);
  const [inspectUnit, setInspectUnit] = useState<string | null>(null);
  const [measurePts, setMeasurePts] = useState<{ x: number; y: number }[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const clampZoom = (z: number) => Math.min(2.4, Math.max(0.85, +z.toFixed(2)));

  const transform = useMemo(() => {
    if (focus || (followMode && selectedId)) {
      const target = focus
        ?? (() => {
          const v = vehicles.find((x) => x.id === selectedId || x.label === selectedId);
          return v ? { x: v.x, y: v.y } : null;
        })();
      if (target) {
        const dx = (50 - target.x) * 0.35;
        const dy = (50 - target.y) * 0.35;
        return `translate(${dx + pan.x}px, ${dy + pan.y}px) scale(${Math.max(zoom, 1.12)})`;
      }
    }
    return `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  }, [zoom, pan, focus, followMode, selectedId, vehicles]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFollowMode(false);
    dragRef.current = null;
    setIsPanning(false);
    pushToast({ tone: 'info', title: 'Map view reset', message: 'Centered on Pit North default extent.' });
  }, [pushToast]);

  const onMapPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Only primary button / touch; skip while measuring (clicks place points)
    if (e.button !== 0) return;
    if (mapTool === 'measure') return;
    // Ignore if started on interactive chrome inside map
    const target = e.target as HTMLElement;
    if (target.closest('[data-map-ui="true"]') || target.closest('button') || target.closest('input') || target.closest('label')) {
      return;
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originPanX: panRef.current.x,
      originPanY: panRef.current.y,
      moved: false,
    };
    setIsPanning(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMapPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) > 3) drag.moved = true;
    if (!drag.moved) return;
    // Pan in screen space; divide by zoom so drag feels 1:1 with the pointer
    const z = zoomRef.current || 1;
    setPan({
      x: drag.originPanX + dx / z,
      y: drag.originPanY + dy / z,
    });
    // Manual pan cancels follow framing until re-armed
    if (followMode) setFollowMode(false);
  };

  const endPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.moved) {
      // Prevent the trailing click after a drag
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    dragRef.current = null;
    setIsPanning(false);
  };

  const onMapWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => clampZoom(z + delta));
  };

  const selectedAsset = useMemo(() => {
    const key = inspectUnit || selectedId;
    if (!key) return null;
    return (
      fleet.find((f) => f.unit === key || f.id === key) ??
      fleet.find((f) => {
        const v = vehicles.find((x) => x.id === key || x.label === key);
        return v && f.unit === v.label;
      }) ??
      null
    );
  }, [inspectUnit, selectedId, fleet, vehicles]);

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

  const showMarker = (v: VehicleMarker) => {
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

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Skip click if user just finished panning
    if (suppressClickRef.current) return;
    if (mapTool !== 'measure' || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMeasurePts((pts) => {
      if (pts.length >= 2) return [{ x, y }];
      const next = [...pts, { x, y }];
      if (next.length === 2) {
        const dx = next[1].x - next[0].x;
        const dy = next[1].y - next[0].y;
        // Approximate map units → rough metres for ops UI (placeholder until CRS)
        const distM = Math.round(Math.hypot(dx, dy) * 42);
        pushToast({
          tone: 'info',
          title: 'Distance measured',
          message: `≈ ${distM} m (local map units · ready for CRS / GPS).`,
        });
      }
      return next;
    });
  };

  const openUnit = (unit: string, x: number, y: number, id?: string) => {
    onSelect(id ?? unit);
    onFocusUnit(x, y, id ?? unit);
    setInspectUnit(unit);
    setOpenPanel(null);
  };

  const mapBody = (
    <div
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
            OPS READY
          </span>
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
          <span className="hidden sm:inline">GPS / WS · standby</span>
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

      <div
        ref={mapRef}
        className={`relative mx-2 mb-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-[#2A3036]/60 touch-none ${
          isPanning ? 'cursor-grabbing' : mapTool === 'measure' ? 'cursor-crosshair' : 'cursor-grab'
        }`}
        onClick={onMapClick}
        onPointerDown={onMapPointerDown}
        onPointerMove={onMapPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onWheel={onMapWheel}
      >
        {/* Map canvas — drag to pan, wheel/slider to zoom */}
        <div
          className={`absolute inset-0 origin-center will-change-transform ${
            isPanning ? '' : 'transition-transform duration-300 ease-out'
          }`}
          style={{ transform }}
        >
          <img
            src="/map/pit-base.png"
            alt="Pit North topographic map"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <radialGradient id="mapVignette" cx="50%" cy="48%" r="62%">
                <stop offset="55%" stopColor="#000" stopOpacity="0" />
                <stop offset="100%" stopColor="#0D1116" stopOpacity="0.45" />
              </radialGradient>
              <pattern id="benchHatch" width="4" height="4" patternUnits="userSpaceOnUse">
                <path d="M0 4 L4 0" stroke="#4A5258" strokeWidth="0.25" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#mapVignette)" />

            {layers.contourLines && (
              <g opacity="0.35" fill="none" stroke="#5A636C" strokeWidth="0.25">
                <ellipse cx="48" cy="48" rx="28" ry="20" />
                <ellipse cx="48" cy="48" rx="20" ry="14" />
                <ellipse cx="48" cy="48" rx="12" ry="8" />
              </g>
            )}

            {layers.benchLevels && (
              <ellipse cx="48" cy="48" rx="22" ry="16" fill="url(#benchHatch)" opacity="0.4" />
            )}

            {layers.geofence && (
              <polygon
                points="30,28 70,26 78,55 52,72 28,58"
                fill="none"
                stroke="#1ADBDE"
                strokeWidth="0.45"
                strokeDasharray="1.2 0.8"
                opacity="0.85"
              />
            )}

            {layers.roads && layers.equipmentLabels && (
              <>
                <text x="18" y="48" fill="#9AA3AB" fontSize="2.4" fontFamily="Inter, system-ui, sans-serif">
                  Haul Road
                </text>
                <text x="58" y="58" fill="#9AA3AB" fontSize="2.4" fontFamily="Inter, system-ui, sans-serif">
                  Road
                </text>
                <text x="66" y="72" fill="#7A848C" fontSize="2" fontFamily="Inter, system-ui, sans-serif" opacity="0.8">
                  North Interchange
                </text>
              </>
            )}

            {layers.haulRoads && (
              <>
                <path
                  d="M18,55 C30,52 38,48 46,44 C58,38 70,40 82,36"
                  fill="none"
                  stroke="#F6A214"
                  strokeWidth="0.55"
                  strokeOpacity="0.55"
                  strokeDasharray="1.4 0.7"
                />
                <circle cx="64" cy="40" r="1.1" fill="#F6A214" opacity="0.9" />
                <circle cx="64" cy="40" r="2.2" fill="none" stroke="#F6A214" strokeWidth="0.25" opacity="0.5" />
              </>
            )}

            {layers.pitZones && (
              <>
                <MapPin x={36} y={38} letter="B" />
                <MapPin x={34} y={62} letter="C" />
                <MapPin x={58} y={40} letter="E" />
              </>
            )}

            {/* Static fleet glyphs (decorative, controlled by fleet visibility) */}
            {fleetVis.trucks && (
              <g opacity="0.95">
                <TruckGlyph x={72} y={34} />
                <TruckGlyph x={74} y={42} />
                <TruckGlyph x={73} y={50} />
              </g>
            )}
            {fleetVis.excavators && <ExcavatorGlyph x={48} y={58} />}

            {/* Measure line preview */}
            {measurePts.length > 0 && (
              <g>
                {measurePts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="0.9" fill="#1ADBDE" />
                ))}
                {measurePts.length === 2 && (
                  <line
                    x1={measurePts[0].x}
                    y1={measurePts[0].y}
                    x2={measurePts[1].x}
                    y2={measurePts[1].y}
                    stroke="#1ADBDE"
                    strokeWidth="0.4"
                    strokeDasharray="1 0.6"
                  />
                )}
              </g>
            )}
          </svg>

          {/* Clickable vehicle markers */}
          {vehicles.filter(showMarker).map((v) => {
            const asset = resolveAssetForMarker(v);
            const hot = alertHighlight(asset);
            const active = selectedId === v.id || inspectUnit === v.label;
            return (
              <button
                key={v.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openUnit(v.label, v.x, v.y, v.id);
                }}
                className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${
                  active ? 'z-20 scale-105' : ''
                }`}
                style={{ left: `${v.x}%`, top: `${v.y}%` }}
                title={`${v.label} · click for details`}
              >
                <div
                  className={`flex items-center gap-1.5 rounded-md border bg-[#0D1116]/92 px-1.5 py-1 shadow-lg backdrop-blur-sm ${
                    hot
                      ? 'border-[#D6403E] ring-1 ring-[#D6403E]/50'
                      : active
                        ? 'border-[#1ADBDE] ring-1 ring-[#1ADBDE]/40'
                        : 'border-[#F6A214]/55'
                  }`}
                >
                  {v.type === 'excavator' ? <ExcavatorIcon /> : <TruckIcon />}
                  {layers.equipmentLabels && (
                    <div className="text-left leading-tight">
                      <div className="text-[10px] font-semibold text-[#E8ECEF]">{v.label}</div>
                      <div className="text-[9px] text-[#8A949C]">{v.detail}</div>
                    </div>
                  )}
                  {hot && <AlertTriangle className="h-3 w-3 text-[#D6403E]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Left legends — keep operational awareness, not crowding center */}
        {layers.pitZones && (
          <div className="pointer-events-auto absolute left-2 top-2 z-20 w-[148px] overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/92 shadow-xl backdrop-blur-sm">
            <div className="border-b border-[#2A3036] px-2.5 py-1.5 text-[10px] font-semibold tracking-wide text-[#E8ECEF]">
              PIT NORTH OPERATIONS
            </div>
            <div className="px-2.5 py-1.5">
              <div className="mb-1 text-[9px] font-semibold tracking-[0.12em] text-[#7A848C]">
                PIT ZONE
              </div>
              <ul className="space-y-1">
                {PIT_ZONE_LEGEND.map((z) => (
                  <li key={z.label} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: z.color }} />
                    <span className="text-[10px] text-[#C8D0D6]">{z.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {layers.pitZones && (
          <div className="absolute bottom-2 left-2 z-20 w-[132px] overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/92 px-2.5 py-1.5 shadow-xl backdrop-blur-sm">
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

        {/* Fleet lists — left of toolbar */}
        {fleetVis.trucks && (
          <div className="absolute right-12 top-2 z-20 w-[148px] overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/92 shadow-xl backdrop-blur-sm">
            <div className="border-b border-[#2A3036] px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#C8D0D6]">
              HAUL TRUCKS
            </div>
            <ul>
              {HAUL_TRUCKS.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openUnit(t.id, t.mapX, t.mapY, t.id);
                    }}
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
          <div className="absolute right-12 top-[148px] z-20 w-[148px] overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/92 shadow-xl backdrop-blur-sm">
            <div className="border-b border-[#2A3036] px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#C8D0D6]">
              EXCAVATORS
            </div>
            <ul>
              {EXCAVATORS.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openUnit(ex.id, ex.mapX, ex.mapY, ex.id);
                    }}
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

        {/* Floating equipment info panel — bottom-center-left, avoids toolbar */}
        {selectedAsset && inspectUnit && (
          <EquipmentInfoPanel
            asset={selectedAsset}
            onClose={() => {
              setInspectUnit(null);
            }}
            onTrack={() => {
              onFocusUnit(selectedAsset.mapX, selectedAsset.mapY, selectedAsset.unit);
              setFollowMode(true);
              pushToast({
                tone: 'success',
                title: `Tracking ${selectedAsset.unit}`,
                message: 'Follow mode armed · live GPS hook ready.',
              });
            }}
            onDetails={() => openAssetDetail(selectedAsset.id)}
          />
        )}

        {/* Right-edge enterprise GIS toolbar */}
        <div
          data-map-ui="true"
          className="absolute right-1.5 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-0.5 rounded-lg border border-[#2A3036] bg-[#0D1116]/95 p-1 shadow-2xl backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
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
            label="Follow / Center"
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
          {/* Single vertical zoom slider — slide up = zoom in, down = zoom out */}
          <div
            className="flex flex-col items-center gap-1 py-1"
            title={`Zoom ${Math.round(zoom * 100)}% · slide up/down`}
          >
            <span className="text-[8px] font-semibold tracking-wide text-[#5A636C]">+</span>
            <input
              type="range"
              min={85}
              max={240}
              step={5}
              value={Math.round(zoom * 100)}
              aria-label="Map zoom"
              onChange={(e) => setZoom(clampZoom(Number(e.target.value) / 100))}
              className="map-zoom-slider h-[88px] w-3 cursor-pointer appearance-none bg-transparent"
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
            />
            <span className="text-[8px] font-semibold tracking-wide text-[#5A636C]">−</span>
            <span className="text-[8px] tabular-nums text-[#6A737C]">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {/* Toolbar flyout panels — dock left of toolbar */}
        {openPanel && (
          <div
            data-map-ui="true"
            className="absolute right-11 top-1/2 z-30 w-[210px] -translate-y-1/2 overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/96 shadow-2xl backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
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
                  icon={<Crosshair className="h-3.5 w-3.5" />}
                  label="Center on selected"
                  onClick={() => {
                    const a = selectedAsset;
                    const v = vehicles.find((x) => x.label === inspectUnit || x.id === selectedId);
                    if (a) onFocusUnit(a.mapX, a.mapY, a.unit);
                    else if (v) onFocusUnit(v.x, v.y, v.id);
                    else pushToast({ tone: 'warning', title: 'No unit selected', message: 'Select equipment on the map first.' });
                    setOpenPanel(null);
                  }}
                />
                <ActionRow
                  icon={<LocateFixed className="h-3.5 w-3.5" />}
                  label={followMode ? 'Stop follow' : 'Follow active vehicle'}
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
                      message: 'Camera tracks selection · WebSocket ready.',
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
                  Highlighted units use red ring · live alert feed later.
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
                      message: 'UI ready · polygon capture hooks later.',
                    });
                  }}
                />
                <ActionRow
                  icon={<Hexagon className="h-3.5 w-3.5" />}
                  label="Select Zone"
                  active={mapTool === 'select-zone'}
                  onClick={() => {
                    setMapTool((t) => (t === 'select-zone' ? 'none' : 'select-zone'));
                    pushToast({ tone: 'info', title: 'Zone select', message: 'Click pit pins B / C / E when live.' });
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

        {/* Future integration strip */}
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 hidden -translate-x-1/2 rounded border border-[#2A3036]/80 bg-[#0D1116]/75 px-2 py-0.5 text-[8px] tracking-wider text-[#4A545C] sm:block">
          REALTIME · GPS · WS · REPLAY · GEOFENCE · AI DISPATCH · READY
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
      </>
    );
  }

  return mapBody;
}

/* ─── Subcomponents ─────────────────────────────────────────────── */

function EquipmentInfoPanel({
  asset,
  onClose,
  onTrack,
  onDetails,
}: {
  asset: FleetAsset;
  onClose: () => void;
  onTrack: () => void;
  onDetails: () => void;
}) {
  return (
    <div
      className="absolute bottom-2 left-[148px] z-30 w-[260px] max-w-[calc(100%-11rem)] overflow-hidden rounded-lg border border-[#2A3036] bg-[#0D1116]/96 shadow-2xl backdrop-blur-md sm:left-36"
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
          <Info label="Operator" value={asset.operator} />
          <Info label="Speed" value={`${asset.speedKph} kph`} />
          <Info label="Payload" value={`${asset.payloadT} t`} />
          <Info label="Fuel" value={`${asset.fuelPct}%`} />
          <Info label="Health" value={`${asset.health}%`} />
          <Info label="Engine" value={asset.engine} />
          <Info label="Assignment" value={asset.assignment} span />
          <Info label="Destination" value={asset.destination} span />
        </dl>
      </div>
      <div className="flex gap-1.5 border-t border-[#2A3036] bg-[#12171C] px-2.5 py-2">
        <button
          type="button"
          onClick={onTrack}
          className="flex-1 rounded-md bg-[#1ADBDE] px-2 py-1 text-[10px] font-semibold text-[#0D1116] hover:bg-[#4AE5E8]"
        >
          Track
        </button>
        <button
          type="button"
          onClick={onDetails}
          className="flex-1 rounded-md border border-[#2A3036] px-2 py-1 text-[10px] font-semibold text-[#C8D0D6] hover:border-[#1ADBDE]/50"
        >
          Full dossier
        </button>
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

function MapPin({ x, y, letter }: { x: number; y: number; letter: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={2.8} fill="#0D1116" stroke="#E8ECEF" strokeWidth={0.4} />
      <text
        x={x}
        y={y + 1.05}
        textAnchor="middle"
        fill="#E8ECEF"
        fontSize="2.8"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {letter}
      </text>
    </g>
  );
}

function TruckGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 1.5}, ${y - 1})`} fill="#F6A214">
      <rect x="0" y="0.4" width="2.2" height="1.3" rx="0.2" />
      <rect x="2.1" y="0.7" width="1.1" height="1" rx="0.15" />
      <circle cx="0.7" cy="1.9" r="0.35" />
      <circle cx="2.5" cy="1.9" r="0.35" />
    </g>
  );
}

function ExcavatorGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 1.5}, ${y - 1.2})`} fill="#F6A214">
      <rect x="0.2" y="1" width="2.4" height="1.1" rx="0.2" />
      <path d="M2.4 1.2 L4.2 0.2 L4.4 0.5 L2.7 1.5 Z" />
      <circle cx="0.8" cy="2.3" r="0.35" />
      <circle cx="2.2" cy="2.3" r="0.35" />
    </g>
  );
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
