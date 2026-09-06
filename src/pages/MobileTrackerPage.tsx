import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Battery,
  Check,
  CheckCircle,
  Clock,
  Compass,
  Copy,
  Droplets,
  Flame,
  Gauge,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Radio,
  RefreshCw,
  Send,
  Share2,
  Shield,
  Smartphone,
  Thermometer,
  Truck,
  Volume2,
  Wifi,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useSearchParams } from 'react-router-dom';
import {
  HAUL_ROADS,
  MINE_CENTER,
  PIT_ZONES,
  POINTS_OF_INTEREST,
  TILE_LAYERS,
  latLngToMapXY,
  mapXYToLatLng,
} from '../lib/mapConfig';
import { apiUrl } from '../lib/api';

// Custom Leaflet pulse marker icon for Mobile GPS target
function createMobileGpsIcon(heading: number = 0, isTransmitting: boolean = true, isSos: boolean = false) {
  const color = isSos ? '#D6403E' : isTransmitting ? '#1ADBDE' : '#8A949C';
  const pulseClass = isSos ? 'animate-ping opacity-75' : isTransmitting ? 'animate-ping opacity-50' : 'hidden';

  return L.divIcon({
    className: 'custom-mobile-gps-marker',
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div class="${pulseClass}" style="position: absolute; inset: 0; border-radius: 9999px; background-color: ${color}; transform: scale(1.4);"></div>
        <div style="position: relative; width: 34px; height: 34px; border-radius: 9999px; background: #0D1116; border: 2.5px solid ${color}; box-shadow: 0 0 16px ${color}88; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transition: transform 0.25s ease-out;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${color}" stroke="#0D1116" stroke-width="1.5">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}

function MapController({
  coords,
  followMode,
}: {
  coords: { lat: number; lng: number } | null;
  followMode: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (coords && followMode) {
      map.panTo([coords.lat, coords.lng], { animate: true, duration: 0.6 });
    }
  }, [coords, followMode, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function MobileTrackerPage() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('code') ?? searchParams.get('invite') ?? '';
  const initialUnit = searchParams.get('unit') ?? '';
  const autoStartParam = searchParams.get('auto') === 'true';

  // Navigation tabs: 'map' | 'cockpit' | 'dispatch' | 'diagnostics'
  const [activeTab, setActiveTab] = useState<'map' | 'cockpit' | 'dispatch' | 'diagnostics'>('map');

  // Device & Operator state
  const [unitLabel, setUnitLabel] = useState(() => {
    return initialUnit || localStorage.getItem('mining_target_unit') || 'HT-04';
  });
  const [operatorName, setOperatorName] = useState(() => {
    return localStorage.getItem('mining_target_operator') || 'Andi Pratama';
  });
  const [assetType, setAssetType] = useState<'Haul Truck' | 'Excavator' | 'Dozer' | 'Support Truck'>('Haul Truck');

  // Operational status
  const [operationalStatus, setOperationalStatus] = useState<
    'Hauling' | 'Loading' | 'Dumping' | 'Queuing' | 'Standby' | 'Breakdown'
  >('Hauling');
  const [engineState, setEngineState] = useState<'Running' | 'Idle' | 'Off'>('Running');
  const [activeRoute, setActiveRoute] = useState('Front Muat Face B ➔ Crusher Pad');
  const [payloadT, setPayloadT] = useState(42.5);
  const [tripsCompleted, setTripsCompleted] = useState(8);
  const [tripDistanceKm, setTripDistanceKm] = useState(14.8);
  const [fuelPct, setFuelPct] = useState(78);
  const [isSosActive, setIsSosActive] = useState(false);
  const [sosReason, setSosReason] = useState<string | null>(null);

  // Tracking engine state
  const [isTracking, setIsTracking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    accuracy?: number;
    altitude?: number | null;
  } | null>(null);
  const [trail, setTrail] = useState<{ lat: number; lng: number }[]>([]);
  const [packetCount, setPacketCount] = useState(0);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [latencyMs, setLatencyMs] = useState(38);
  const [copiedLink, setCopiedLink] = useState(false);

  // Map settings
  const [selectedTileLayer, setSelectedTileLayer] = useState<'satellite' | 'dark' | 'osm'>('satellite');
  const [followMode, setFollowMode] = useState(true);

  // References
  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const wakeLockRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRegisteredRef = useRef(false);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // Auto-walk Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const simAngleRef = useRef(0);

  // Load invite info if available
  useEffect(() => {
    if (inviteCode) {
      fetch(apiUrl('/api/gps/devices'))
        .then((res) => res.json())
        .then((data) => {
          const matched = data.devices?.find((d: any) => d.code === inviteCode || d.inviteCode === inviteCode);
          if (matched) {
            if (matched.unitLabel) setUnitLabel(matched.unitLabel);
            if (matched.operatorName || matched.ownerName) {
              setOperatorName(matched.operatorName || matched.ownerName);
            }
          }
        })
        .catch(() => {});
    }
  }, [inviteCode]);

  // Persist unit & operator to localStorage
  useEffect(() => {
    localStorage.setItem('mining_target_unit', unitLabel);
    localStorage.setItem('mining_target_operator', operatorName);
  }, [unitLabel, operatorName]);

  // BroadcastChannel setup
  useEffect(() => {
    localStorage.removeItem('gps_teleport_offset');
    try {
      channelRef.current = new BroadcastChannel('mining_gps_channel');
    } catch {
      // fallback to storage events
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      if (channelRef.current) channelRef.current.close();
    };
  }, []);

  // Screen Wake Lock API
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      } catch (e) {
        console.warn('Wake Lock request failed:', e);
      }
    }
  };

  // Background Live WebAudio Stream + Media Session Lock
  const startSilentAudioHeartbeat = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001; // virtually silent

          const dst = ctx.createMediaStreamDestination();
          osc.connect(gain);
          gain.connect(dst);
          gain.connect(ctx.destination);
          osc.start();

          audioCtxRef.current = ctx;

          const audio = new Audio();
          audio.srcObject = dst.stream;
          audio.volume = 0.01;
          audio.play().catch(() => {});
          audioElementRef.current = audio;
        } else if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
          if (audioElementRef.current) audioElementRef.current.play().catch(() => {});
        }
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `Kabin FMS: ${unitLabel.toUpperCase()} (${operationalStatus})`,
          artist: `Operator: ${operatorName}`,
          album: 'Mining Command GPS Cockpit Active',
          artwork: [{ src: '/favicon.svg', sizes: '96x96', type: 'image/svg+xml' }],
        });

        const resumeAudio = () => {
          if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
          }
          if (audioElementRef.current) {
            audioElementRef.current.play().catch(() => {});
          }
        };

        navigator.mediaSession.setActionHandler('play', resumeAudio);
        navigator.mediaSession.setActionHandler('pause', resumeAudio);
      }

      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {
      console.warn('Background media session service failed:', e);
    }
  };

  const stopSilentAudioHeartbeat = () => {
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
      } catch {}
      audioElementRef.current = null;
    }
  };

  // Register device on backend server
  const registerDeviceOnServer = async (lat: number, lng: number, accuracy?: number) => {
    try {
      const codeKey = inviteCode || unitLabel.toUpperCase();
      await fetch(apiUrl('/api/gps/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeKey,
          deviceName: `${unitLabel.toUpperCase()} (${operatorName})`,
          unitLabel: unitLabel.toUpperCase(),
          operatorName,
          platform: /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'android',
          lat,
          lng,
          speedKph: coords?.speed ? Math.round(coords.speed * 3.6) : 0,
          heading: coords?.heading ?? 0,
          operationalStatus,
          engineStatus: engineState,
          payloadT,
          fuelPct,
          destination: activeRoute,
          tripsToday: tripsCompleted,
          sos: isSosActive,
          accuracy: accuracy || 5,
        }),
      });
      isRegisteredRef.current = true;
    } catch (err) {
      console.warn('Initial GPS registration failed:', err);
    }
  };

  // Broadcast position & telemetry packet
  const broadcastPosition = async (
    lat: number,
    lng: number,
    speed: number,
    heading: number,
    accuracy?: number,
    alt?: number | null,
    overrideStatus?: typeof operationalStatus,
    overrideSos?: boolean,
  ) => {
    if (!isRegisteredRef.current) {
      await registerDeviceOnServer(lat, lng, accuracy);
    }

    const currentOpStatus = overrideStatus || operationalStatus;
    const currentSos = overrideSos !== undefined ? overrideSos : isSosActive;

    const payload = {
      type: 'GPS_UPDATE',
      unitLabel: unitLabel.toUpperCase(),
      deviceName: `${unitLabel.toUpperCase()} (${operatorName})`,
      operatorName,
      code: inviteCode || unitLabel.toUpperCase(),
      lat,
      lng,
      speedKph: Math.round(speed * 3.6),
      heading,
      altitude: alt ?? null,
      accuracyM: accuracy || 5,
      operationalStatus: currentOpStatus,
      engineStatus: engineState,
      payloadT,
      fuelPct,
      destination: activeRoute,
      tripsToday: tripsCompleted,
      tripDistanceKm,
      sos: currentSos,
      sosMessage: sosReason,
      timestamp: Date.now(),
    };

    // Calculate distance delta for odometer
    if (lastPosRef.current) {
      const dLat = (lat - lastPosRef.current.lat) * 111.32; // ~km
      const dLng = (lng - lastPosRef.current.lng) * 111.32 * Math.cos((lat * Math.PI) / 180);
      const deltaKm = Math.sqrt(dLat * dLat + dLng * dLng);
      if (deltaKm > 0.002 && deltaKm < 0.5) {
        setTripDistanceKm((prev) => +(prev + deltaKm).toFixed(2));
      }
    }
    lastPosRef.current = { lat, lng };

    // Broadcast across tabs
    if (channelRef.current) {
      channelRef.current.postMessage(payload);
    }

    // Local storage event sync
    localStorage.setItem('mining_gps_live_data', JSON.stringify(payload));
    setPacketCount((c) => c + 1);

    // Send HTTP POST to central server
    const startT = performance.now();
    try {
      await fetch(apiUrl('/api/gps/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setLatencyMs(Math.round(performance.now() - startT));
    } catch (err) {
      console.warn('HTTP GPS Sync failed:', err);
    }
  };

  // Start GPS Transmitter
  const startTracking = async () => {
    if (!navigator.geolocation && !isSimulating) {
      setErrorMsg('Perangkat HP Anda tidak mendukung GPS Geolocation.');
      return;
    }

    setErrorMsg(null);
    setIsTracking(true);

    await requestWakeLock();
    startSilentAudioHeartbeat();

    const processPosition = (pos: GeolocationPosition) => {
      let lat = pos.coords.latitude;
      let lng = pos.coords.longitude;
      let speed = pos.coords.speed ?? 0;
      let heading = pos.coords.heading ?? 0;
      const accuracy = pos.coords.accuracy;
      const altitude = pos.coords.altitude;

      // Auto-Walk Simulation if enabled
      if (isSimulating) {
        simAngleRef.current += 0.08;
        const radiusLat = 0.0016; // ~180m
        const radiusLng = 0.0022;
        lat = MINE_CENTER[0] + Math.sin(simAngleRef.current) * radiusLat;
        lng = MINE_CENTER[1] + Math.cos(simAngleRef.current) * radiusLng;
        speed = 6.2; // ~22 kph
        heading = ((simAngleRef.current * 180) / Math.PI + 90) % 360;
      }

      setCoords({ lat, lng, speed, heading, accuracy, altitude });

      // Append to local breadcrumb trail
      setTrail((prev) => {
        const last = prev[prev.length - 1];
        if (!last || Math.abs(last.lat - lat) > 0.00004 || Math.abs(last.lng - lng) > 0.00004) {
          return [...prev, { lat, lng }].slice(-50);
        }
        return prev;
      });

      broadcastPosition(lat, lng, speed, heading, accuracy, altitude);
    };

    if (!isSimulating) {
      const id = navigator.geolocation.watchPosition(
        processPosition,
        (err) => {
          let msg = 'Gagal mengakses sinyal GPS.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Izin lokasi ditolak di browser HP Anda. Silakan izinkan akses lokasi.';
          }
          setErrorMsg(msg);
          setIsTracking(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        },
      );

      watchIdRef.current = id;
    }

    // Periodic heartbeat loop (forces update every 1.5 seconds)
    intervalRef.current = setInterval(() => {
      if (isSimulating) {
        processPosition({
          coords: {
            latitude: 0,
            longitude: 0,
            accuracy: 3,
            speed: 5.5,
            heading: 90,
            altitude: 45,
            altitudeAccuracy: null,
          },
          timestamp: Date.now(),
        } as any);
      } else {
        navigator.geolocation.getCurrentPosition(
          processPosition,
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 3000 },
        );
      }
    }, 1500);
  };

  // Stop GPS Transmitter
  const stopTracking = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    stopSilentAudioHeartbeat();
    setIsTracking(false);
  };

  // Auto-start if requested in URL
  useEffect(() => {
    if (autoStartParam && !isTracking) {
      startTracking();
    }
  }, [autoStartParam]);

  // Re-acquire WakeLock & send instant update on tab focus
  useEffect(() => {
    const handleVisibility = () => {
      if ((document.visibilityState === 'visible' || document.hasFocus()) && isTracking) {
        requestWakeLock();
        if (navigator.geolocation && !isSimulating) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCoords({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                speed: pos.coords.speed ?? 0,
                heading: pos.coords.heading ?? 0,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
              });
              broadcastPosition(
                pos.coords.latitude,
                pos.coords.longitude,
                pos.coords.speed ?? 0,
                pos.coords.heading ?? 0,
                pos.coords.accuracy,
                pos.coords.altitude,
              );
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 0, timeout: 3000 },
          );
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [isTracking, isSimulating, operationalStatus, isSosActive]);

  // Quick Operational Status Changer
  const handleStatusChange = (newStatus: typeof operationalStatus) => {
    setOperationalStatus(newStatus);
    if (coords) {
      broadcastPosition(
        coords.lat,
        coords.lng,
        coords.speed,
        coords.heading,
        coords.accuracy,
        coords.altitude,
        newStatus,
      );
    }
  };

  // Quick SOS Trigger
  const handleTriggerSos = (reason: string) => {
    const nextSos = !isSosActive;
    setIsSosActive(nextSos);
    setSosReason(nextSos ? reason : null);

    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }

    if (coords) {
      broadcastPosition(
        coords.lat,
        coords.lng,
        coords.speed,
        coords.heading,
        coords.accuracy,
        coords.altitude,
        nextSos ? 'Breakdown' : operationalStatus,
        nextSos,
      );
    }
  };

  // Quick Canned Radio Message
  const [cannedSent, setCannedSent] = useState<string | null>(null);
  const handleSendRadioMessage = (msg: string) => {
    setCannedSent(msg);
    setTimeout(() => setCannedSent(null), 3000);

    if (coords) {
      broadcastPosition(coords.lat, coords.lng, coords.speed, coords.heading, coords.accuracy, coords.altitude);
    }
  };

  // Copy share link
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Compute map center
  const mapCenter: LatLngTuple = coords ? [coords.lat, coords.lng] : MINE_CENTER;

  // Active tile layer
  const tileLayer = TILE_LAYERS.find((tl) => tl.id === selectedTileLayer) ?? TILE_LAYERS[0];

  const currentSpeedKph = coords ? Math.round(coords.speed * 3.6) : 0;
  const isOverSpeed = currentSpeedKph > 30;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0A0E13] text-[#E8ECEF] font-sans antialiased overflow-x-hidden select-none pb-safe">
      {/* ── TOP APP BAR ────────────────────────────────────── */}
      <header className="sticky top-0 z-[1200] flex items-center justify-between border-b border-[#222831] bg-[#0D1116]/95 px-3.5 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1ADBDE]/20 to-[#1ADBDE]/5 border border-[#1ADBDE]/40 text-[#1ADBDE]">
            <Truck className="h-5 w-5" />
            {isTracking && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3AC7A3] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3AC7A3]"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black tracking-wider text-[#1ADBDE]">{unitLabel}</span>
              <span className="rounded bg-[#1A222C] px-1.5 py-0.5 text-[9px] font-bold text-[#8A949C]">
                {assetType}
              </span>
            </div>
            <div className="text-[10px] font-medium text-[#7A848C] truncate max-w-[150px]">
              {operatorName} · Shift A
            </div>
          </div>
        </div>

        {/* Status Pill & SOS indicator */}
        <div className="flex items-center gap-2">
          {isSosActive && (
            <span className="animate-pulse rounded-full bg-[#D6403E] px-2 py-0.5 text-[9px] font-extrabold text-white">
              🚨 SOS
            </span>
          )}
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide border ${
              isTracking
                ? 'bg-[#3AC7A3]/10 border-[#3AC7A3]/40 text-[#3AC7A3]'
                : 'bg-[#1E242B] border-[#2A3036] text-[#7A848C]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isTracking ? 'bg-[#3AC7A3] animate-ping' : 'bg-[#5A636C]'}`}
            />
            {isTracking ? 'LIVE BEACON' : 'OFFLINE'}
          </span>
        </div>
      </header>

      {/* ── SOS ACTIVE BANNER ──────────────────────────────── */}
      {isSosActive && (
        <div className="flex items-center justify-between bg-[#D6403E] px-4 py-2 text-xs font-bold text-white shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4" />
            <span>SINYAL DARURAT AKTIF — POSISI ANDA DIPRIORITASKAN DI DISPATCH!</span>
          </div>
          <button
            onClick={() => handleTriggerSos('Matikan')}
            className="rounded bg-white/20 px-2 py-1 text-[10px] font-black uppercase hover:bg-white/30"
          >
            Matikan SOS
          </button>
        </div>
      )}

      {/* ── TAB NAVIGATION BAR ──────────────────────────────── */}
      <nav className="flex border-b border-[#222831] bg-[#11161C] px-1 py-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition-all ${
            activeTab === 'map'
              ? 'bg-[#1ADBDE] text-[#0D1116] shadow-md shadow-[#1ADBDE]/20'
              : 'text-[#8A949C] hover:text-[#E8ECEF]'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>PETA</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cockpit')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition-all ${
            activeTab === 'cockpit'
              ? 'bg-[#1ADBDE] text-[#0D1116] shadow-md shadow-[#1ADBDE]/20'
              : 'text-[#8A949C] hover:text-[#E8ECEF]'
          }`}
        >
          <Gauge className="h-4 w-4" />
          <span>KABIN</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dispatch')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition-all ${
            activeTab === 'dispatch'
              ? 'bg-[#1ADBDE] text-[#0D1116] shadow-md shadow-[#1ADBDE]/20'
              : 'text-[#8A949C] hover:text-[#E8ECEF]'
          }`}
        >
          <Radio className="h-4 w-4" />
          <span>RADIO & SOS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition-all ${
            activeTab === 'diagnostics'
              ? 'bg-[#1ADBDE] text-[#0D1116] shadow-md shadow-[#1ADBDE]/20'
              : 'text-[#8A949C] hover:text-[#E8ECEF]'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>STATUS</span>
        </button>
      </nav>

      {/* ── TAB CONTENT CONTAINER ──────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-28">
        {/* ════════ TAB 1: LIVE MAP ════════ */}
        {activeTab === 'map' && (
          <div className="relative flex-1 flex flex-col h-[calc(100vh-175px)] w-full min-h-[380px]">
            <MapContainer
              center={mapCenter}
              zoom={16}
              minZoom={13}
              maxZoom={19}
              zoomControl={false}
              className="h-full w-full flex-1 z-0 bg-[#0D1116]"
            >
              <TileLayer
                key={tileLayer.id}
                url={tileLayer.url}
                attribution={tileLayer.attribution}
                maxZoom={tileLayer.maxZoom}
                subdomains={tileLayer.subdomains || []}
              />

              <MapController coords={coords} followMode={followMode} />

              {/* Pit Zones */}
              {PIT_ZONES.map((zone) => (
                <Polygon
                  key={zone.id}
                  positions={zone.coords}
                  pathOptions={{
                    color: zone.color,
                    weight: 2,
                    fillColor: zone.color,
                    fillOpacity: zone.fillOpacity,
                  }}
                >
                  <Tooltip permanent direction="center" className="pit-zone-label">
                    <span className="font-bold text-[10px] uppercase text-[#E8ECEF]">{zone.name}</span>
                  </Tooltip>
                </Polygon>
              ))}

              {/* Haul Roads */}
              {HAUL_ROADS.map((road) => (
                <Polyline
                  key={road.id}
                  positions={road.coords}
                  pathOptions={{
                    color: road.color,
                    weight: 3,
                    dashArray: road.dashArray,
                    opacity: 0.8,
                  }}
                />
              ))}

              {/* Points of Interest */}
              {POINTS_OF_INTEREST.map((poi) => (
                <Marker
                  key={poi.id}
                  position={poi.position}
                  icon={L.divIcon({
                    className: 'poi-marker',
                    html: `<div style="background: #12171C; border: 1.5px solid #F6A214; color: #F6A214; padding: 2px 5px; font-size: 8px; font-weight: 800; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">${poi.label}</div>`,
                    iconAnchor: [30, 10],
                  })}
                />
              ))}

              {/* Breadcrumb Trail */}
              {trail.length > 1 && (
                <Polyline
                  positions={trail.map((t) => [t.lat, t.lng] as LatLngTuple)}
                  pathOptions={{
                    color: isSosActive ? '#D6403E' : '#1ADBDE',
                    weight: 4,
                    opacity: 0.85,
                    dashArray: '4 6',
                  }}
                />
              )}

              {/* Target Vehicle Live GPS Marker */}
              {coords && (
                <Marker
                  position={[coords.lat, coords.lng]}
                  icon={createMobileGpsIcon(coords.heading, isTracking, isSosActive)}
                >
                  <Tooltip permanent direction="top" offset={[0, -20]}>
                    <div className="font-mono text-[10px] font-bold text-[#1ADBDE] bg-[#0D1116] px-1.5 py-0.5 rounded border border-[#1ADBDE]/40">
                      {unitLabel} · {currentSpeedKph} km/h
                    </div>
                  </Tooltip>
                  <Popup>
                    <div className="text-xs p-1 font-sans text-[#0D1116]">
                      <div className="font-bold">{unitLabel}</div>
                      <div>Driver: {operatorName}</div>
                      <div>Status: {operationalStatus}</div>
                      <div>Speed: {currentSpeedKph} km/h</div>
                      <div>GPS Accuracy: ±{Math.round(coords.accuracy || 0)}m</div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Floating Map HUD (Top Left) */}
            <div className="absolute top-2.5 left-2.5 z-[1000] flex flex-col gap-1.5">
              <div className="rounded-xl border border-[#2A3036] bg-[#0D1116]/90 p-2.5 shadow-xl backdrop-blur-md">
                <div className="text-[9px] font-bold tracking-wider text-[#6A737C]">STATUS ARMADA</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      operationalStatus === 'Hauling'
                        ? 'bg-[#3AC7A3]'
                        : operationalStatus === 'Loading'
                        ? 'bg-[#FFB800]'
                        : operationalStatus === 'Dumping'
                        ? 'bg-[#1ADBDE]'
                        : operationalStatus === 'Queuing'
                        ? 'bg-[#B57EDC]'
                        : operationalStatus === 'Breakdown'
                        ? 'bg-[#D6403E]'
                        : 'bg-[#7A848C]'
                    }`}
                  />
                  <span className="font-bold text-xs text-[#E8ECEF] uppercase">{operationalStatus}</span>
                </div>
                <div className="text-[10px] text-[#1ADBDE] font-semibold mt-1 truncate max-w-[160px]">
                  {activeRoute}
                </div>
              </div>
            </div>

            {/* Floating Speed & Compass Badge (Top Right) */}
            <div className="absolute top-2.5 right-2.5 z-[1000] flex flex-col items-end gap-1.5">
              <div
                className={`flex flex-col items-center justify-center rounded-xl border p-2.5 shadow-xl backdrop-blur-md ${
                  isOverSpeed
                    ? 'border-[#D6403E] bg-[#D6403E]/20 text-[#D6403E] animate-pulse'
                    : 'border-[#2A3036] bg-[#0D1116]/90 text-[#E8ECEF]'
                }`}
              >
                <div className="font-mono text-2xl font-black leading-none">{currentSpeedKph}</div>
                <div className="text-[9px] font-bold text-[#8A949C]">KM / JAM</div>
                {isOverSpeed && <div className="text-[8px] font-extrabold text-[#D6403E]">OVERSPEED!</div>}
              </div>

              {/* Follow Camera Toggle */}
              <button
                type="button"
                onClick={() => setFollowMode(!followMode)}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold shadow-lg backdrop-blur-md transition-all ${
                  followMode
                    ? 'border-[#1ADBDE] bg-[#1ADBDE] text-[#0D1116]'
                    : 'border-[#2A3036] bg-[#0D1116]/90 text-[#8A949C]'
                }`}
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>{followMode ? '🎯 IKUTI KAMERA' : 'BEBAS'}</span>
              </button>

              {/* Map Tile Switcher */}
              <div className="flex rounded-lg border border-[#2A3036] bg-[#0D1116]/90 p-0.5 shadow-lg backdrop-blur-md">
                {(['satellite', 'dark', 'osm'] as const).map((tId) => (
                  <button
                    key={tId}
                    type="button"
                    onClick={() => setSelectedTileLayer(tId)}
                    className={`rounded px-1.5 py-1 text-[9px] font-bold uppercase transition-all ${
                      selectedTileLayer === tId
                        ? 'bg-[#1ADBDE] text-[#0D1116]'
                        : 'text-[#6A737C] hover:text-[#E8ECEF]'
                    }`}
                  >
                    {tId === 'satellite' ? 'SAT' : tId === 'dark' ? 'DARK' : 'OSM'}
                  </button>
                ))}
              </div>
            </div>

            {/* Floating Mini Compass & Elevation (Bottom Left) */}
            <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 rounded-xl border border-[#2A3036] bg-[#0D1116]/90 px-3 py-1.5 shadow-xl backdrop-blur-md text-[10px] font-mono">
              <div className="flex items-center gap-1 text-[#1ADBDE]">
                <Compass className="h-3.5 w-3.5" />
                <span>{Math.round(coords?.heading || 0)}°</span>
              </div>
              <span className="text-[#3A424A]">|</span>
              <div className="text-[#8A949C]">
                AKURASI: <span className="text-[#3AC7A3]">±{Math.round(coords?.accuracy || 5)}m</span>
              </div>
            </div>
          </div>
        )}

        {/* ════════ TAB 2: OPERATOR COCKPIT ════════ */}
        {activeTab === 'cockpit' && (
          <div className="p-4 space-y-4">
            {/* 1. Quick Operational Status Selector */}
            <div className="rounded-2xl border border-[#2A3036] bg-[#12171C] p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wider text-[#8A949C] uppercase">
                  STATUS OPERASIONAL TRUK
                </span>
                <span className="text-[10px] font-semibold text-[#1ADBDE]">Klik untuk ubah langsung</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Hauling', label: 'HAULING', sub: 'Mengangkut', color: '#3AC7A3' },
                  { id: 'Loading', label: 'LOADING', sub: 'Muat di Front', color: '#FFB800' },
                  { id: 'Dumping', label: 'DUMPING', sub: 'Tumpah Crusher', color: '#1ADBDE' },
                  { id: 'Queuing', label: 'QUEUING', sub: 'Antri Lokasi', color: '#B57EDC' },
                  { id: 'Standby', label: 'STANDBY', sub: 'Istirahat / Siaga', color: '#7A848C' },
                  { id: 'Breakdown', label: 'BREAKDOWN', sub: 'Trouble Unit', color: '#D6403E' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleStatusChange(st.id as any)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 border transition-all ${
                      operationalStatus === st.id
                        ? 'border-[#1ADBDE] bg-[#1ADBDE]/15 shadow-[0_0_15px_rgba(26,219,222,0.3)]'
                        : 'border-[#2A3036] bg-[#0D1116] hover:border-[#3A424A]'
                    }`}
                  >
                    <span className="text-xs font-black tracking-wide" style={{ color: st.color }}>
                      {st.label}
                    </span>
                    <span className="text-[9px] text-[#7A848C] mt-0.5">{st.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Speedometer & Digital HUD */}
            <div className="rounded-2xl border border-[#2A3036] bg-[#12171C] p-4 shadow-xl flex flex-col items-center justify-center text-center">
              <div className="text-xs font-bold tracking-wider text-[#8A949C] uppercase mb-2">
                SPEEDOMETER & BATAS KECEPATAN PIT
              </div>

              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-[#1ADBDE]/30 bg-[#0D1116] shadow-[inset_0_0_30px_rgba(26,219,222,0.1)]">
                <div className="flex flex-col items-center">
                  <span
                    className={`font-mono text-4xl font-black tracking-tight ${
                      isOverSpeed ? 'text-[#D6403E] animate-pulse' : 'text-[#1ADBDE]'
                    }`}
                  >
                    {currentSpeedKph}
                  </span>
                  <span className="text-[10px] font-bold text-[#8A949C]">KM / JAM</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between w-full rounded-xl border border-[#2A3036] bg-[#0D1116] px-3.5 py-2 text-xs">
                <span className="text-[#8A949C]">BATAS KECEPATAN PIT:</span>
                <span className="font-bold text-[#FFB800]">MAX 30 KM/H</span>
                <span
                  className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                    isOverSpeed ? 'bg-[#D6403E] text-white animate-pulse' : 'bg-[#3AC7A3]/20 text-[#3AC7A3]'
                  }`}
                >
                  {isOverSpeed ? 'OVERSPEED!' : 'KECEPATAN AMAN'}
                </span>
              </div>
            </div>

            {/* 3. Haul Cycles & Trip Telemetry */}
            <div className="rounded-2xl border border-[#2A3036] bg-[#12171C] p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-[#8A949C] uppercase">
                  SIKLUS RITASE & MUATAN
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTripsCompleted((t) => t + 1);
                    if (coords) broadcastPosition(coords.lat, coords.lng, coords.speed, coords.heading);
                  }}
                  className="rounded-lg bg-[#1ADBDE] px-2.5 py-1 text-[10px] font-extrabold text-[#0D1116] hover:bg-[#4AE5E8]"
                >
                  +1 Selesai Ritase
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <div className="text-[9px] text-[#6A737C] font-bold">TOTAL RIT</div>
                  <div className="font-mono text-lg font-bold text-[#3AC7A3]">{tripsCompleted} Rit</div>
                </div>
                <div className="rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <div className="text-[9px] text-[#6A737C] font-bold">JARAK TEMPUH</div>
                  <div className="font-mono text-lg font-bold text-[#1ADBDE]">{tripDistanceKm} km</div>
                </div>
                <div className="rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <div className="text-[9px] text-[#6A737C] font-bold">MUATAN TON</div>
                  <div className="font-mono text-lg font-bold text-[#FFB800]">{payloadT} t</div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A949C] block mb-1">RUTE AKTIF</label>
                <select
                  value={activeRoute}
                  onChange={(e) => {
                    setActiveRoute(e.target.value);
                    if (coords) broadcastPosition(coords.lat, coords.lng, coords.speed, coords.heading);
                  }}
                  className="w-full rounded-lg border border-[#2A3036] bg-[#0D1116] px-3 py-2 text-xs font-semibold text-[#E8ECEF] focus:border-[#1ADBDE] focus:outline-none"
                >
                  <option value="Front Muat Face B ➔ Crusher Pad">Front Muat Face B ➔ Crusher Pad</option>
                  <option value="Front Muat Face C ➔ Dump East">Front Muat Face C ➔ Dump East</option>
                  <option value="Front Muat Pit North ➔ Stockpile A">Front Muat Pit North ➔ Stockpile A</option>
                  <option value="Workshop Main Yard ➔ Pit Zone A">Workshop Main Yard ➔ Pit Zone A</option>
                </select>
              </div>
            </div>

            {/* 4. Engine & Vehicle Health Sensors */}
            <div className="rounded-2xl border border-[#2A3036] bg-[#12171C] p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-[#8A949C] uppercase">
                  SENSOR KESEHATAN MESIN
                </span>
                <div className="flex items-center gap-1 bg-[#0D1116] p-1 rounded-lg border border-[#2A3036]">
                  {(['Running', 'Idle', 'Off'] as const).map((es) => (
                    <button
                      key={es}
                      type="button"
                      onClick={() => {
                        setEngineState(es);
                        if (coords) broadcastPosition(coords.lat, coords.lng, coords.speed, coords.heading);
                      }}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                        engineState === es
                          ? es === 'Running'
                            ? 'bg-[#3AC7A3] text-[#0D1116]'
                            : es === 'Idle'
                            ? 'bg-[#FFB800] text-[#0D1116]'
                            : 'bg-[#D6403E] text-white'
                          : 'text-[#6A737C]'
                      }`}
                    >
                      {es.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <span className="flex items-center gap-1.5 text-[#8A949C]">
                    <Droplets className="h-3.5 w-3.5 text-[#1ADBDE]" /> Solar
                  </span>
                  <span className="font-mono font-bold text-[#3AC7A3]">{fuelPct}%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <span className="flex items-center gap-1.5 text-[#8A949C]">
                    <Thermometer className="h-3.5 w-3.5 text-[#FFB800]" /> Coolant
                  </span>
                  <span className="font-mono font-bold text-[#E8ECEF]">89 °C</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <span className="flex items-center gap-1.5 text-[#8A949C]">
                    <Gauge className="h-3.5 w-3.5 text-[#1ADBDE]" /> Oli Mesin
                  </span>
                  <span className="font-mono font-bold text-[#E8ECEF]">48 psi</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <span className="flex items-center gap-1.5 text-[#8A949C]">
                    <Activity className="h-3.5 w-3.5 text-[#3AC7A3]" /> Hidrolik
                  </span>
                  <span className="font-mono font-bold text-[#E8ECEF]">210 bar</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════ TAB 3: DISPATCH & SOS ════════ */}
        {activeTab === 'dispatch' && (
          <div className="p-4 space-y-4">
            {/* BIG SOS PANIC BUTTON */}
            <div className="rounded-2xl border-2 border-[#D6403E]/60 bg-gradient-to-b from-[#D6403E]/20 to-[#12171C] p-5 shadow-2xl text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-[#D6403E]">
                <AlertOctagon className="h-6 w-6 animate-pulse" />
                <span className="font-black text-sm tracking-wider uppercase">TOMBOL DARURAT (SOS)</span>
              </div>
              <p className="text-xs text-[#C8D0D6]">
                Pancarkan sinyal darurat breakdown / bahaya kecelakaan langsung ke konsol Dispatcher & Live Map.
              </p>

              <button
                type="button"
                onClick={() => handleTriggerSos(isSosActive ? 'Normal' : 'Darurat Lapangan: Butuh Bantuan Cepat')}
                className={`w-full py-4 rounded-xl font-black text-base tracking-wider uppercase transition-all shadow-xl ${
                  isSosActive
                    ? 'bg-white text-[#D6403E] hover:bg-slate-200'
                    : 'bg-[#D6403E] text-white hover:bg-[#E54D4B] animate-pulse'
                }`}
              >
                {isSosActive ? 'NONAKTIFKAN SINYAL SOS' : '🚨 PANCARKAN SINYAL DARURAT (SOS)'}
              </button>
            </div>

            {/* Quick Radio Canned Messages */}
            <div className="rounded-2xl border border-[#2A3036] bg-[#12171C] p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-[#8A949C] uppercase">
                  PESAN CEPAT DISPATCH
                </span>
                <Radio className="h-4 w-4 text-[#1ADBDE]" />
              </div>

              {cannedSent && (
                <div className="rounded-lg bg-[#3AC7A3]/20 border border-[#3AC7A3]/40 p-2.5 text-xs text-[#3AC7A3] font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Pesan terkirim ke Dispatcher: "{cannedSent}"</span>
                </div>
              )}

              <div className="space-y-2">
                {[
                  '✅ Tiba di Lokasi Muat (Face B)',
                  '🚚 Muatan Penuh, Meluncur ke Crusher',
                  '⏳ Antrian Panjang di Lokasi Dumping',
                  '⛽ Minta Pengisian Fuel Truck di Lokasi',
                  '⚠️ Jalan Haul Road Licin / Amblas',
                  '🔧 Butuh Bantuan Mekanik di Lokasi',
                ].map((msg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendRadioMessage(msg)}
                    className="w-full flex items-center justify-between rounded-xl border border-[#2A3036] bg-[#0D1116] p-3 text-xs font-semibold text-[#E8ECEF] hover:border-[#1ADBDE] hover:bg-[#151D24] transition-all text-left"
                  >
                    <span>{msg}</span>
                    <Send className="h-3.5 w-3.5 text-[#1ADBDE] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════ TAB 4: DIAGNOSTICS & STATUS ════════ */}
        {activeTab === 'diagnostics' && (
          <div className="p-4 space-y-4">
            {/* Identity Setup */}
            <div className="rounded-2xl border border-[#2A3036] bg-[#12171C] p-4 shadow-xl space-y-3">
              <span className="text-xs font-bold tracking-wider text-[#8A949C] uppercase block">
                PENGATURAN IDENTITAS TRUK
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#6A737C] block mb-1">ID / UNIT TRUK</label>
                  <input
                    type="text"
                    disabled={isTracking}
                    value={unitLabel}
                    onChange={(e) => {
                      setUnitLabel(e.target.value);
                      isRegisteredRef.current = false;
                    }}
                    className="w-full rounded-lg border border-[#2A3036] bg-[#0D1116] px-3 py-2 font-mono text-xs font-bold text-[#1ADBDE] focus:border-[#1ADBDE] focus:outline-none disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#6A737C] block mb-1">NAMA OPERATOR</label>
                  <input
                    type="text"
                    disabled={isTracking}
                    value={operatorName}
                    onChange={(e) => {
                      setOperatorName(e.target.value);
                      isRegisteredRef.current = false;
                    }}
                    className="w-full rounded-lg border border-[#2A3036] bg-[#0D1116] px-3 py-2 text-xs font-bold text-[#E8ECEF] focus:border-[#1ADBDE] focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Checkbox Walk Test */}
              <div className="flex items-center gap-2 rounded-lg border border-[#2A3036] bg-[#0D1116] p-2.5">
                <input
                  type="checkbox"
                  id="sim-diag"
                  disabled={isTracking}
                  checked={isSimulating}
                  onChange={(e) => setIsSimulating(e.target.checked)}
                  className="h-4 w-4 rounded border-[#2A3036] accent-[#1ADBDE]"
                />
                <label htmlFor="sim-diag" className="text-xs font-semibold text-[#C8D0D6] cursor-pointer">
                  Simulasi Pergerakan Otomatis (Uji Coba Walk Test)
                </label>
              </div>
            </div>

            {/* Diagnostic Signals & Latency */}
            <div className="rounded-2xl border border-[#2A3036] bg-[#12171C] p-4 shadow-xl space-y-3">
              <span className="text-xs font-bold tracking-wider text-[#8A949C] uppercase block">
                DIAGNOSTIK KONEKSI & LATENSI
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <div className="text-[9px] text-[#6A737C]">PAKET TERKIRIM</div>
                  <div className="font-bold text-[#3AC7A3] text-sm">{packetCount} paket</div>
                </div>
                <div className="rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <div className="text-[9px] text-[#6A737C]">PING SERVER</div>
                  <div className="font-bold text-[#1ADBDE] text-sm">{latencyMs} ms</div>
                </div>
                <div className="rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <div className="text-[9px] text-[#6A737C]">WAKE LOCK LAYAR</div>
                  <div className={`font-bold text-xs ${wakeLockActive ? 'text-[#3AC7A3]' : 'text-[#6A737C]'}`}>
                    {wakeLockActive ? '● AKTIF (ON)' : 'OFF'}
                  </div>
                </div>
                <div className="rounded-xl border border-[#2A3036] bg-[#0D1116] p-2.5">
                  <div className="text-[9px] text-[#6A737C]">BACKGROUND LOCK</div>
                  <div className={`font-bold text-xs ${isTracking ? 'text-[#1ADBDE]' : 'text-[#6A737C]'}`}>
                    {isTracking ? '● HEARTBEAT ON' : 'OFF'}
                  </div>
                </div>
              </div>

              {coords && (
                <div className="rounded-xl border border-[#2A3036] bg-[#0D1116] p-3 text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#6A737C]">LATITUDE:</span>
                    <span className="text-[#E8ECEF] font-bold">{coords.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6A737C]">LONGITUDE:</span>
                    <span className="text-[#E8ECEF] font-bold">{coords.lng.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6A737C]">ELEVASI:</span>
                    <span className="text-[#E8ECEF] font-bold">{coords.altitude ? `${Math.round(coords.altitude)} m` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6A737C]">AKURASI GPS:</span>
                    <span className="text-[#3AC7A3] font-bold">±{Math.round(coords.accuracy || 5)} meter</span>
                  </div>
                </div>
              )}
            </div>

            {/* Share / Copy Link */}
            <div className="rounded-2xl border border-[#2A3036] bg-[#12171C] p-4 shadow-xl space-y-2">
              <span className="text-xs font-bold tracking-wider text-[#8A949C] uppercase block">
                BAGIKAN LINK KE HP LAIN
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#2A3036] bg-[#0D1116] py-3 text-xs font-bold text-[#1ADBDE] hover:border-[#1ADBDE]/50"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? 'LINK DISALIN KE CLIPBOARD' : 'SALIN LINK TRACKER HP INI'}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── ERROR TOAST ────────────────────────────────────── */}
      {errorMsg && (
        <div className="fixed bottom-24 left-4 right-4 z-[1400] flex items-center gap-2 rounded-xl border border-[#D6403E]/50 bg-[#D6403E] p-3 text-xs font-bold text-white shadow-2xl">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="rounded p-1 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── PERSISTENT BOTTOM FLOATING ACTION BAR ────────── */}
      <footer className="fixed bottom-0 left-0 right-0 z-[1300] border-t border-[#222831] bg-[#0D1116]/95 px-4 py-3 shadow-2xl backdrop-blur-lg">
        <button
          type="button"
          onClick={isTracking ? stopTracking : startTracking}
          className={`w-full rounded-xl py-3.5 text-sm font-black tracking-wider uppercase transition-all shadow-xl ${
            isTracking
              ? 'bg-[#D6403E] text-white hover:bg-[#E54D4B] shadow-[#D6403E]/30'
              : 'bg-gradient-to-r from-[#1ADBDE] to-[#3AC7A3] text-[#0D1116] hover:brightness-110 shadow-[#1ADBDE]/30 animate-pulse'
          }`}
        >
          {isTracking ? '⏹ HENTIKAN PANCARAN GPS' : '🚀 MULAI PANCARKAN GPS HP'}
        </button>
      </footer>
    </div>
  );
}
