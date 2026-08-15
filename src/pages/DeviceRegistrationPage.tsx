import {
  AlertCircle,
  CheckCircle,
  Compass,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  Smartphone,
  Wifi,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOps } from '../contexts/OpsContext';

export default function DeviceRegistrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  const {
    gpsDevices,
    registerGpsDevice,
    updateGpsDevicePosition,
    pushToast,
    t,
  } = useOps();

  const [step, setStep] = useState<'validating' | 'permission' | 'registering' | 'success' | 'error'>('validating');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [platform, setPlatform] = useState<'ios' | 'android'>('android');
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);
  const registeredDeviceIdRef = useRef<string | null>(null);

  // Helper to sync device/position to central server over tunnel
  const syncToServer = async (endpoint: 'register' | 'update', payload: any) => {
    try {
      await fetch(`/api/gps/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`Sync to /api/gps/${endpoint} failed:`, err);
    }
  };

  // Screen Wake Lock API to prevent phone screen from sleeping/turning off GPS
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

  // Device fingerprint
  const getDeviceFingerprint = () => {
    const ua = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = navigator.language;
    const raw = `${ua}|${screen}|${tz}|${lang}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  };

  useEffect(() => {
    if (!code) {
      setStep('error');
      setErrorMsg('Kode undangan tidak ditemukan di URL.');
      return;
    }

    // Validate invite code locally or fetch from server store
    const device = gpsDevices.find(d => d.inviteCode === code);
    if (device) {
      const now = new Date().getTime();
      const expires = device.inviteExpiresAt ? new Date(device.inviteExpiresAt).getTime() : 0;
      if (expires && now > expires) {
        setStep('error');
        setErrorMsg('Kode undangan telah kedaluwarsa (maksimal 7 hari).');
        return;
      }
      setDeviceName(device.name);
      setUnitLabel(device.assetUnit || '');
      setStep('permission');
    } else {
      // Try validating code with server store
      fetch('/api/gps/devices')
        .then(res => res.json())
        .then(data => {
          const matched = data.devices?.find((d: any) => d.code === code || d.inviteCode === code);
          if (matched) {
            setDeviceName(matched.deviceName || matched.name || 'Perangkat HP');
            setUnitLabel(matched.unitLabel || matched.assetUnit || '');
            setStep('permission');
          } else {
            // Allow proceed with code as valid invite
            setDeviceName('Perangkat HP');
            setStep('permission');
          }
        })
        .catch(() => {
          setDeviceName('Perangkat HP');
          setStep('permission');
        });
    }
  }, [code, gpsDevices]);

  // Handle visibilitychange to re-sync when tab becomes visible again on mobile
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        if (navigator.geolocation && code) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude, accuracy } = pos.coords;
              setCoords({ lat: latitude, lng: longitude, accuracy });
              syncToServer('update', { code, lat: latitude, lng: longitude, accuracy });
            },
            () => {},
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [code]);

  const requestPermission = async () => {
    if (!navigator.geolocation) {
      setErrorMsg('Perangkat ini tidak mendukung GPS Geolocation.');
      setStep('error');
      return;
    }

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude, accuracy } = pos.coords;
      setCoords({ lat: latitude, lng: longitude, accuracy });

      setStep('registering');

      const fingerprint = getDeviceFingerprint();
      const detectedPlatform = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'android';
      const matchedDevice = gpsDevices.find((device) => device.inviteCode === code);

      // Register locally in context
      const registered = registerGpsDevice(code!, {
        fingerprint,
        platform: detectedPlatform,
        lat: latitude,
        lng: longitude,
        accuracy,
      });

      if (registered && matchedDevice?.id) {
        registeredDeviceIdRef.current = matchedDevice.id;
        updateGpsDevicePosition(matchedDevice.id, latitude, longitude, 100, accuracy);
      }

      // SYNC TO SERVER over network
      await syncToServer('register', {
        code,
        fingerprint,
        deviceName: deviceName || 'Perangkat HP',
        unitLabel,
        platform: detectedPlatform,
        lat: latitude,
        lng: longitude,
        accuracy,
      });

      // Request Screen Wake Lock so mobile screen stays awake during operational tracking
      await requestWakeLock();

      setStep('success');
      startBackgroundTracking();

      countdownRef.current = setTimeout(() => {
        navigate('/live-ops');
      }, 3000);
    } catch (err: unknown) {
      const ge = err as GeolocationPositionError;
      let msg = 'Gagal mengakses lokasi GPS.';
      if (ge.code === ge.PERMISSION_DENIED) {
        msg = 'Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan browser HP Anda, lalu refresh halaman ini.';
      } else if (ge.code === ge.TIMEOUT) {
        msg = 'Permintaan lokasi timeout. Pastikan GPS HP aktif dan coba lagi.';
      }
      setErrorMsg(msg);
      setStep('error');
    }
  };

  const startBackgroundTracking = () => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords({ lat: latitude, lng: longitude, accuracy });
        if (code) {
          syncToServer('update', { code, lat: latitude, lng: longitude, accuracy });
        }
        if (registeredDeviceIdRef.current) {
          updateGpsDevicePosition(registeredDeviceIdRef.current, latitude, longitude, 100, accuracy);
        }
      },
      (err) => {
        console.warn('Background tracking error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );
    setWatchId(id);
  };

  const stopBackgroundTracking = () => {
    registeredDeviceIdRef.current = null;
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
      stopBackgroundTracking();
    };
  }, []);

  if (step === 'validating') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0D1116] p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1ADBDE]" />
          <p className="text-[#E8ECEF] font-mono text-lg">MEMVALIDASI KODE UNDANGAN…</p>
          <p className="text-xs text-[#6A737C] max-w-xs">Mengecek keabsahan link pendaftaran perangkat GPS…</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0D1116] p-4">
        <div className="w-full max-w-md rounded-xl border border-[#2A3036] bg-[#12171C] p-6 text-center">
          <AlertCircle className="h-14 w-14 mx-auto text-[#D6403E]" />
          <h2 className="mt-4 text-lg font-semibold text-[#E8ECEF]">REGISTRASI GAGAL</h2>
          <p className="mt-2 text-sm text-[#8A949C]">{errorMsg || 'Terjadi kesalahan tidak diketahui.'}</p>
          <div className="mt-6 flex gap-2 justify-center">
            <button
              onClick={() => window.history.back()}
              className="rounded-lg border border-[#2A3036] bg-[#0D1116] px-4 py-2 text-sm font-semibold text-[#E8ECEF] hover:border-[#1ADBDE]/50"
            >
              KEMBALI
            </button>
            <a
              href="/"
              className="rounded-lg bg-[#1ADBDE] px-4 py-2 text-sm font-bold text-[#0D1116] hover:bg-[#4AE5E8]"
            >
              KE DASHBOARD
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0D1116] p-4">
        <div className="w-full max-w-md rounded-xl border border-[#3AC7A3]/40 bg-[#12171C] p-6 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center mx-auto">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#3AC7A3]/30" />
            <CheckCircle className="h-20 w-20 text-[#3AC7A3]" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#E8ECEF]">PERANGKAT TERDAFTAR</h2>
          <p className="mt-2 text-sm text-[#8A949C]">
            {deviceName} berhasil terhubung ke Mining Command.
          </p>
          {coords && (
            <div className="mt-4 rounded-lg border border-[#2A3036] bg-[#0D1116] p-3 text-xs text-left font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-[#6A737C]">LAT</span>
                <span className="text-[#1ADBDE]">{coords.lat.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6A737C]">LNG</span>
                <span className="text-[#1ADBDE]">{coords.lng.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6A737C]">AKURASI</span>
                <span className="text-[#F6A214]">±{Math.round(coords.accuracy)}m</span>
              </div>
              <div className="flex justify-between border-t border-[#2A3036] pt-1 mt-1">
                <span className="text-[#6A737C]">LAYAR MENYALA (WAKE LOCK)</span>
                <span className={wakeLockActive ? 'text-[#3AC7A3] font-bold' : 'text-[#8A949C]'}>
                  {wakeLockActive ? '● AKTIF' : 'NON-AKTIF'}
                </span>
              </div>
            </div>
          )}
          <p className="mt-4 text-xs text-[#1ADBDE]">Mengarahkan ke Live Ops dalam 3 detik…</p>
        </div>
      </div>
    );
  }

  // step === 'permission'
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0D1116] p-4 text-[#E8ECEF] overflow-y-auto overflow-x-hidden pb-20 pb-safe">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#2A3036] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1ADBDE]/10 border border-[#1ADBDE]/30 text-[#1ADBDE]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wider text-[#E8ECEF]">MINING COMMAND</h1>
            <div className="text-[10px] text-[#1ADBDE] font-semibold">DAFTAR PERANGKAT GPS HP</div>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-[#3AC7A3]/10 border border-[#3AC7A3]/40 px-2 py-0.5 text-[9px] font-semibold text-[#3AC7A3]">
          <Wifi className="h-3 w-3" /> SIAP DAFTAR
        </span>
      </div>

      {/* Main Card */}
      <div className="mt-4 flex-1 flex flex-col justify-between rounded-xl border border-[#2A3036] bg-[#12171C] p-5 shadow-2xl overflow-y-auto">
        <div className="space-y-4">
          {/* Device Info */}
          <div className="rounded-lg border border-[#2A3036] bg-[#0D1116] p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-[#1ADBDE]" />
              <span className="text-xs font-semibold text-[#8A949C]">INFO PERANGKAT</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#5A636C] block">NAMA</span>
                <span className="font-bold text-[#1ADBDE]">{deviceName}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#5A636C] block">KODE</span>
                <span className="font-bold text-[#E8ECEF]">{code?.slice(0, 8).toUpperCase()}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#5A636C] block">PLATFORM</span>
                <span className="font-bold text-[#E8ECEF]">{platform === 'ios' ? 'iOS' : 'Android'}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#5A636C] block">UNIT ASET</span>
                <span className="font-bold text-[#E8ECEF]">{unitLabel || '—'}</span>
              </div>
            </div>
          </div>

          {/* GPS Permission */}
          <div className="rounded-lg border border-[#1ADBDE]/30 bg-[#1ADBDE]/5 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1ADBDE]/10 text-[#1ADBDE]">
                <Navigation className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#E8ECEF]">AKTIFKAN IZIN LOKASI GPS</h3>
                <p className="mt-1 text-xs text-[#8A949C]">
                  Mining Command memerlukan akses lokasi presisi tinggi (GPS) untuk melacak posisi HP ini secara real-time
                  dan mengirimkan sinyal ke Peta Armada Operator secara langsung.
                </p>
              </div>
            </div>

            {/* Background / Screen Note Banner */}
            <div className="rounded-md border border-[#F6A214]/40 bg-[#F6A214]/10 p-3 text-xs text-[#F6A214] flex items-start gap-2">
              <Zap className="h-4 w-4 shrink-0 mt-0.5 text-[#F6A214]" />
              <div>
                <p className="font-semibold text-[11px] uppercase">Catatan Lacak Lapangan (OS HP):</p>
                <p className="text-[10px] text-[#E8ECEF] leading-tight mt-0.5">
                  Layar HP akan dijaga tetap menyala (Screen Wake Lock) otomatis agar sistem GPS HP tidak dimatikan oleh sistem hemat daya Android/iOS saat bertugas.
                </p>
              </div>
            </div>

            {coords && (
              <div className="mt-3 rounded-md border border-[#1ADBDE]/30 bg-[#0D1116] p-3 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#6A737C]">LAT</span>
                  <span className="text-[#1ADBDE]">{coords.lat.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A737C]">LNG</span>
                  <span className="text-[#1ADBDE]">{coords.lng.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A737C]">AKURASI</span>
                  <span className="text-[#F6A214]">±{Math.round(coords.accuracy)}m</span>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-[#D6403E]/40 bg-[#D6403E]/10 p-3 text-xs text-[#D6403E]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Platform Select */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8A949C]">PLATFORM HP</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPlatform('android')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  platform === 'android'
                    ? 'border-[#1ADBDE] bg-[#1ADBDE]/10 text-[#1ADBDE]'
                    : 'border-[#2A3036] bg-[#0D1116] text-[#8A949C] hover:border-[#1ADBDE]/50'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <span>🤖</span> Android
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform('ios')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  platform === 'ios'
                    ? 'border-[#1ADBDE] bg-[#1ADBDE]/10 text-[#1ADBDE]'
                    : 'border-[#2A3036] bg-[#0D1116] text-[#8A949C] hover:border-[#1ADBDE]/50'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <span>📱</span> iOS
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={requestPermission}
            disabled={step !== 'permission'}
            className="w-full rounded-xl bg-[#1ADBDE] py-3.5 text-sm font-bold tracking-wider text-[#0D1116] hover:bg-[#4AE5E8] disabled:opacity-50 disabled:cursor-not-active shadow-lg shadow-[#1ADBDE]/20"
          >
            {step === 'registering' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> MENDAFTARKAN PERANGKAT…
              </span>
            ) : (
              'AKTIFKAN GPS & DAFTARKAN'
            )}
          </button>
          <p className="text-center text-[10px] text-[#5A636C]">
            Link undangan berlaku 7 hari · Posisi disinkronkan otomatis secara real-time
          </p>
        </div>
      </div>
    </div>
  );
}
