import {
  AlertCircle,
  CheckCircle,
  Compass,
  MapPin,
  Navigation,
  Radio,
  Share2,
  Shield,
  Smartphone,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function MobileTrackerPage() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('code') ?? searchParams.get('invite') ?? '';
  const [unitLabel, setUnitLabel] = useState('MOBILE-HP-01');
  const [isTracking, setIsTracking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; speed: number; heading: number; accuracy?: number } | null>(null);
  const [packetCount, setPacketCount] = useState(0);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const wakeLockRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Persistent Live MediaStream + Media Session API background lock
  // Tricks Android/iOS into treating the tab as a background live music service (like Spotify)
  // preventing the OS from killing JS execution or GPS position updates when screen locks or app is minimized.
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

      // Register Media Session API for persistent OS notification shade lock
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `GPS Transmitter: ${unitLabel.toUpperCase()}`,
          artist: 'Mining Command FMS',
          album: 'Background Location Service Active',
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

      // Request Notification permission for elevated OS background execution privileges
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

  const isRegisteredRef = useRef(false);

  const registerDeviceOnServer = async (lat: number, lng: number, accuracy?: number) => {
    try {
      const codeKey = inviteCode || unitLabel.toUpperCase();
      await fetch('/api/gps/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeKey,
          deviceName: unitLabel.toUpperCase(),
          unitLabel: unitLabel.toUpperCase(),
          platform: /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'android',
          lat,
          lng,
          accuracy: accuracy || 5,
        }),
      });
      isRegisteredRef.current = true;
    } catch (err) {
      console.warn('Initial GPS registration failed:', err);
    }
  };

  const broadcastPosition = async (lat: number, lng: number, speed: number, heading: number, accuracy?: number) => {
    if (!isRegisteredRef.current) {
      await registerDeviceOnServer(lat, lng, accuracy);
    }

    const payload = {
      type: 'GPS_UPDATE',
      unitLabel: unitLabel.toUpperCase(),
      deviceName: unitLabel.toUpperCase(),
      code: inviteCode || unitLabel.toUpperCase(),
      lat,
      lng,
      speedKph: Math.round(speed * 3.6),
      heading,
      accuracyM: accuracy || 5,
      timestamp: Date.now(),
    };

    if (channelRef.current) {
      channelRef.current.postMessage(payload);
    }

    localStorage.setItem('mining_gps_live_data', JSON.stringify(payload));
    setPacketCount((c) => c + 1);

    // HTTP POST to server over Cloudflare tunnel / local server
    try {
      await fetch('/api/gps/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('HTTP GPS Sync failed:', err);
    }
  };

  const [isSimulating, setIsSimulating] = useState(false);
  const simAngleRef = useRef(0);

  const startTracking = async () => {
    if (!navigator.geolocation && !isSimulating) {
      setErrorMsg('Perangkat HP Anda tidak mendukung GPS Geolocation.');
      return;
    }

    setErrorMsg(null);
    setIsTracking(true);

    await requestWakeLock();
    startSilentAudioHeartbeat();

    const MINE_CENTER = { lat: -3.4500, lng: 114.8400 };

    const processPosition = (pos: GeolocationPosition) => {
      let lat = pos.coords.latitude;
      let lng = pos.coords.longitude;
      let speed = pos.coords.speed ?? 0;
      let heading = pos.coords.heading ?? 0;
      const accuracy = pos.coords.accuracy;

      // Fitur Simulasi Bergerak (Auto Walk) jika diaktifkan untuk pengujian
      if (isSimulating) {
        simAngleRef.current += 0.15;
        const radius = 0.0012; // ~130 meters radius loop
        lat = MINE_CENTER.lat + Math.sin(simAngleRef.current) * radius;
        lng = MINE_CENTER.lng + Math.cos(simAngleRef.current) * radius;
        speed = 4.5; // ~16 kph
        heading = (simAngleRef.current * 180) / Math.PI % 360;
      }

      setCoords({ lat, lng, speed, heading, accuracy });
      broadcastPosition(lat, lng, speed, heading, accuracy);
    };

    if (!isSimulating) {
      const id = navigator.geolocation.watchPosition(
        processPosition,
        (err) => {
          let msg = 'Gagal mengakses sinyal GPS.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Izin akses lokasi ditolak di browser HP Anda.';
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

    // Periodic heartbeat loop (forces position update every 1.5 seconds)
    intervalRef.current = setInterval(() => {
      if (isSimulating) {
        processPosition({
          coords: { latitude: 0, longitude: 0, accuracy: 3, speed: 4, heading: 90, altitude: null, altitudeAccuracy: null },
          timestamp: Date.now(),
        } as any);
      } else {
        navigator.geolocation.getCurrentPosition(
          processPosition,
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 3000 }
        );
      }
    }, 1500);
  };

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

  // Re-acquire WakeLock & instantly send current position if browser tab regains focus
  useEffect(() => {
    const handleVisibility = () => {
      if ((document.visibilityState === 'visible' || document.hasFocus()) && isTracking) {
        requestWakeLock();
        if (navigator.geolocation && !isSimulating) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, speed: pos.coords.speed ?? 0, heading: pos.coords.heading ?? 0 });
              broadcastPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.speed ?? 0, pos.coords.heading ?? 0, pos.coords.accuracy);
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 0, timeout: 3000 }
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
  }, [isTracking, isSimulating]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0D1116] p-4 text-[#E8ECEF] font-sans overflow-y-auto overflow-x-hidden pb-20 pb-safe">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#2A3036] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1ADBDE]/10 border border-[#1ADBDE]/30 text-[#1ADBDE]">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wider text-[#E8ECEF]">MINING COMMAND</h1>
            <div className="text-[10px] text-[#1ADBDE] font-semibold">MOBILE GPS BEACON TRANSMITTER</div>
          </div>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${
          isTracking ? 'bg-[#3AC7A3]/10 border border-[#3AC7A3]/40 text-[#3AC7A3]' : 'bg-[#2A3036] text-[#7A848C]'
        }`}>
          {isTracking ? '● BROADCASTING' : 'OFFLINE'}
        </span>
      </div>

      {/* Main Card */}
      <div className="mt-4 flex-1 flex flex-col justify-between rounded-xl border border-[#2A3036] bg-[#12171C] p-5 shadow-2xl overflow-y-auto max-h-[calc(100vh-200px)]">
        <div className="space-y-4">
          <div>
            <label htmlFor="mobile-tracker-unit-label" className="mb-1.5 block text-xs font-semibold text-[#8A949C]">
              ID / NAMA ARMADA HP
            </label>
            <input
              id="mobile-tracker-unit-label"
              name="unitLabel"
              type="text"
              disabled={isTracking}
              value={unitLabel}
              onChange={(e) => {
                setUnitLabel(e.target.value);
                isRegisteredRef.current = false;
              }}
              placeholder="MOB-HP-01"
              className="w-full rounded-lg border border-[#2A3036] bg-[#0D1116] px-3.5 py-2.5 font-mono text-sm font-bold text-[#1ADBDE] focus:border-[#1ADBDE] focus:outline-none disabled:opacity-60"
            />
          </div>

          {/* Checkbox Simulasi Pergerakan (Auto Walk) */}
          <div className="flex items-center gap-2 rounded-lg border border-[#2A3036] bg-[#0D1116] p-2.5">
            <input
              type="checkbox"
              id="sim-check"
              name="simCheck"
              disabled={isTracking}
              checked={isSimulating}
              onChange={(e) => setIsSimulating(e.target.checked)}
              className="h-4 w-4 rounded border-[#2A3036] accent-[#1ADBDE]"
            />
            <label htmlFor="sim-check" className="text-xs font-semibold text-[#C8D0D6] cursor-pointer">
              Simulasi Pergerakan Otomatis (Uji Coba Jalan / Walk Test)
            </label>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-[#D6403E]/40 bg-[#D6403E]/10 p-3 text-xs text-[#D6403E]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Big Radar Indicator */}
          <div className="my-4 flex flex-col items-center justify-center text-center">
            <div className={`relative flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all ${
              isTracking
                ? 'border-[#1ADBDE] bg-[#1ADBDE]/5 shadow-[0_0_40px_rgba(26,219,222,0.25)]'
                : 'border-[#2A3036] bg-[#151A1F]'
            }`}>
              {isTracking && (
                <div className="absolute inset-0 animate-ping rounded-full border border-[#1ADBDE]/40" />
              )}
              <Navigation
                className={`h-10 w-10 transition-transform ${
                  isTracking ? 'text-[#1ADBDE]' : 'text-[#5A636C]'
                }`}
                style={{ transform: `rotate(${coords?.heading || 0}deg)` }}
              />
            </div>

            <div className="mt-3">
              <div className="text-xs font-semibold text-[#8A949C]">STATUS KONEKSI TRANSMITTER</div>
              <div className="text-sm font-bold text-[#E8ECEF]">
                {isTracking ? 'GPS Tersambung & Mengirim Posisi' : 'GPS Belum Aktif'}
              </div>
            </div>
          </div>

          {/* Keep Alive Info Banner */}
          <div className="rounded-lg border border-[#2A3036] bg-[#0D1116] p-3 text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#8A949C] text-[10px]">LAYAR AWAKE (WAKE LOCK)</span>
              <span className={`text-[10px] font-bold ${wakeLockActive ? 'text-[#3AC7A3]' : 'text-[#5A636C]'}`}>
                {wakeLockActive ? '● AKTIF' : 'OFF'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8A949C] text-[10px]">PENINGKAT LATAR BELAKANG</span>
              <span className={`text-[10px] font-bold ${isTracking ? 'text-[#1ADBDE]' : 'text-[#5A636C]'}`}>
                {isTracking ? '● HEARTBEAT RUNNING' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Real-time Telemetry Values */}
          {coords && (
            <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-[#2A3036] bg-[#0D1116] p-3 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#5A636C] block">LATITUDE</span>
                <span className="font-bold text-[#E8ECEF]">{coords.lat.toFixed(5)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#5A636C] block">LONGITUDE</span>
                <span className="font-bold text-[#E8ECEF]">{coords.lng.toFixed(5)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#5A636C] block">KECEPATAN</span>
                <span className="font-bold text-[#1ADBDE]">{Math.round(coords.speed * 3.6)} kph</span>
              </div>
              <div>
                <span className="text-[10px] text-[#5A636C] block">PAKET TERKIRIM</span>
                <span className="font-bold text-[#3AC7A3]">{packetCount} paket</span>
              </div>
            </div>
          )}
        </div>

        {/* Big Action Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={isTracking ? stopTracking : startTracking}
            className={`w-full rounded-xl py-3.5 text-sm font-bold tracking-wider transition-all shadow-lg ${
              isTracking
                ? 'bg-[#D6403E] text-white hover:bg-[#E54D4B]'
                : 'bg-[#1ADBDE] text-[#0D1116] hover:bg-[#4AE5E8]'
            }`}
          >
            {isTracking ? 'HENTIKAN PANCARAN GPS' : 'MULAI PANCARKAN GPS HP'}
          </button>
        </div>
      </div>
    </div>
  );
}
