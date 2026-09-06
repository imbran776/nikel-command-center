import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io } from 'socket.io-client';
import { ALERTS, FLEET, MINES, NOTIFICATIONS, SHIFTS } from '../data/enterprise';
import {
  buildCsv,
  generateInviteCode,
  triggerBrowserDownload,
} from '../lib/export';
import { apiUrl } from '../lib/api';
import {
  applyTheme,
  loadPrefs,
  savePrefs,
  t as translate,
  type Locale,
  type ThemeMode,
} from '../lib/i18n';
import { mapXYToLatLng } from '../lib/mapConfig';
import type {
  EquipmentRow,
  FleetAsset,
  GpsDevice,
  MineSite,
  NavItemId,
  NotificationItem,
  OpsAlert,
  ShiftInfo,
} from '../types/fms';

export type ToastTone = 'info' | 'success' | 'warning' | 'critical';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
}

export type ModalKind =
  | null
  | { type: 'unit'; row: EquipmentRow }
  | { type: 'asset'; asset: FleetAsset }
  | { type: 'radio'; unit: string; driver: string }
  | { type: 'service'; unit: string; driver: string }
  | { type: 'confirm-flag'; unit: string }
  | { type: 'assign'; unit?: string }
  | { type: 'settings' }
  | { type: 'filter-equipment' }
  | { type: 'map-settings' }
  | { type: 'shift-report' }
  | {
      type: 'export-preview';
      filename: string;
      content: string;
      mime?: string;
      title?: string;
    }
  | { type: 'confirm'; title: string; message: string; actionLabel: string; onConfirm: () => void };

export interface EquipmentFilter {
  status: 'all' | 'Active' | 'Idle' | 'Maintenance' | 'Offline';
  query: string;
  flaggedOnly: boolean;
}

export interface MapLayers {
  haulRoads: boolean;
  pitZones: boolean;
  fleet: boolean;
  pins: boolean;
  labels: boolean;
  heat: boolean;
}

export interface OpsSettings {
  autoRefresh: boolean;
  soundAlerts: boolean;
  highContrast: boolean;
  unitsMetric: boolean;
  shiftCode: string;
  siteCode: string;
  opsLead: string;
  /** UI + Copilot language */
  locale: Locale;
  /** Color theme */
  theme: ThemeMode;
}

export interface OpsContextValue {
  activeNav: NavItemId;
  setActiveNav: (id: NavItemId) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;

  mineId: string;
  setMineId: (id: string) => void;
  mine: MineSite;
  shiftId: string;
  setShiftId: (id: string) => void;
  shift: ShiftInfo;
  mines: MineSite[];
  shifts: ShiftInfo[];

  globalQuery: string;
  setGlobalQuery: (q: string) => void;

  lastSync: Date;
  systemStatus: 'operational' | 'degraded' | 'offline';

  toasts: ToastItem[];
  pushToast: (t: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;

  modal: ModalKind;
  openModal: (m: Exclude<ModalKind, null>) => void;
  closeModal: () => void;

  alerts: OpsAlert[];
  alertCount: number;
  acknowledgeAlert: (id: string) => void;
  acknowledgeAll: () => void;

  notifications: NotificationItem[];
  unreadNotifications: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  flaggedUnits: Set<string>;
  toggleFlagUnit: (unit: string) => void;

  equipmentFilter: EquipmentFilter;
  setEquipmentFilter: (f: EquipmentFilter) => void;

  mapLayers: MapLayers;
  setMapLayer: (key: keyof MapLayers, value: boolean) => void;

  settings: OpsSettings;
  updateSettings: (patch: Partial<OpsSettings>) => void;
  /** Translate UI string by key using current locale, with optional params for interpolation */
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  theme: ThemeMode;

  selectedEquipmentId: string | null;
  setSelectedEquipmentId: (id: string | null) => void;

  fleet: FleetAsset[];
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  openAssetDetail: (id: string) => void;

  /** GPS Devices for tracking */
  gpsDevices: GpsDevice[];
  addGpsDevice: (device: Omit<GpsDevice, 'id' | 'createdAt'>) => GpsDevice;
  removeGpsDevice: (id: string) => void;
  updateGpsDevicePosition: (id: string, lat: number, lng: number, batteryPct?: number, accuracyM?: number) => void;
  generateDeviceInvite: (deviceId: string) => string;
  generateFullDeviceInvite: (payload: { operatorName: string; unitLabel: string; deviceName: string; armadaType: string }) => Promise<{ url: string; code: string }>;
  registerGpsDevice: (code: string, payload: { fingerprint: string; platform: 'ios' | 'android'; lat: number; lng: number; accuracy: number }) => boolean;
  resetDailyTrails: () => void;
  resetSingleDeviceTrail: (key: string) => void;

  /**
   * Export CSV: try browser download + always open preview modal
   * (preview downloads often fail to reach the host OS Downloads folder).
   */
  exportCsv: (filename: string, headers: string[], rows: (string | number)[][], title?: string) => void;

  /** Ops Copilot dock — when open, main board shifts left so panel never covers UI */
  copilotOpen: boolean;
  setCopilotOpen: (v: boolean) => void;
  toggleCopilot: () => void;
  copilotWidth: number;
  setCopilotWidth: (w: number) => void;
}

const OpsContext = createContext<OpsContextValue | null>(null);

export function OpsProvider({ children }: { children: ReactNode }) {
  const [activeNav, setActiveNav] = useState<NavItemId>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mineId, setMineId] = useState(MINES[0].id);
  const [shiftId, setShiftId] = useState(SHIFTS[1].id);
  const [globalQuery, setGlobalQuery] = useState('');
  const [lastSync, setLastSync] = useState(() => new Date());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [alerts, setAlerts] = useState<OpsAlert[]>(ALERTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);
  const [flaggedUnits, setFlaggedUnits] = useState<Set<string>>(() => new Set(['HT-07']));
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>({
    status: 'all',
    query: '',
    flaggedOnly: false,
  });
  const [mapLayers, setMapLayers] = useState<MapLayers>({
    haulRoads: true,
    pitZones: true,
    fleet: true,
    pins: true,
    labels: true,
    heat: false,
  });
  const [fleet, setFleet] = useState<FleetAsset[]>(() => FLEET.map((f) => ({ ...f })));
  const [gpsDevices, setGpsDevices] = useState<GpsDevice[]>([]);
  const prefs = loadPrefs();
  const [settings, setSettings] = useState<OpsSettings>({
    autoRefresh: true,
    soundAlerts: true,
    highContrast: false,
    unitsMetric: true,
    shiftCode: 'SHIFT-B',
    siteCode: 'PIT-N',
    opsLead: 'Aldi',
    locale: prefs.locale,
    theme: prefs.theme,
  });
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotWidth, setCopilotWidth] = useState(380);

  useEffect(() => {
    applyTheme(settings.theme);
    savePrefs(settings.locale, settings.theme);
  }, [settings.theme, settings.locale]);

  useEffect(() => {
    const id = window.setInterval(() => setLastSync(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  // GPS Sync & Socket.io Real-time connection
  useEffect(() => {
    const processDevices = (devices: any[]) => {
      if (!Array.isArray(devices) || devices.length === 0) return;
      
      setGpsDevices((prev) => {
        let updated = [...prev];
        for (const serverDev of devices) {
          // Match by inviteCode, id, code, unitLabel, or name
          const idx = updated.findIndex(
            (d) =>
              (d.inviteCode && d.inviteCode === serverDev.code) ||
              (d.id && d.id === serverDev.id) ||
              (d.assetUnit && d.assetUnit === serverDev.code) ||
              (d.assetUnit && d.assetUnit === serverDev.unitLabel) ||
              (d.name && d.name === serverDev.name && serverDev.name !== 'HP GPS Device' && serverDev.name !== 'Perangkat HP')
          );
          const newName = serverDev.deviceName || serverDev.name || (serverDev.unitLabel ? `Device ${serverDev.unitLabel}` : undefined);
          const newUnit = serverDev.unitLabel || serverDev.code;

          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              name: newName || updated[idx].name,
              assetUnit: newUnit || updated[idx].assetUnit,
              assetId: newUnit || updated[idx].assetId,
              lat: serverDev.lat ?? updated[idx].lat,
              lng: serverDev.lng ?? updated[idx].lng,
              accuracyM: serverDev.accuracyM ?? updated[idx].accuracyM,
              batteryPct: serverDev.batteryPct ?? updated[idx].batteryPct,
              speedKph: serverDev.speedKph ?? updated[idx].speedKph,
              heading: serverDev.heading ?? updated[idx].heading,
              operationalStatus: serverDev.operationalStatus || updated[idx].operationalStatus,
              engineStatus: serverDev.engineStatus || updated[idx].engineStatus,
              payloadT: serverDev.payloadT ?? updated[idx].payloadT,
              fuelPct: serverDev.fuelPct ?? updated[idx].fuelPct,
              destination: serverDev.destination || updated[idx].destination,
              assignment: serverDev.assignment || updated[idx].assignment,
              tripsToday: serverDev.tripsToday ?? updated[idx].tripsToday,
              sos: serverDev.sos ?? updated[idx].sos,
              sosMessage: serverDev.sosMessage || updated[idx].sosMessage,
              status: 'online',
              lastSeen: serverDev.lastSeen || new Date().toISOString(),
              registeredAt: updated[idx].registeredAt || new Date().toISOString(),
              trail: serverDev.trail && serverDev.trail.length > 0 ? serverDev.trail : updated[idx].trail,
            };
          } else if (serverDev.code || serverDev.id) {
            // Add device registered from mobile
            updated.push({
              id: serverDev.id || `gps-${Date.now()}`,
              name: newName || 'HP GPS Device',
              type: 'phone',
              platform: serverDev.platform || 'android',
              ownerId: 'op-mobile',
              ownerName: serverDev.ownerName || serverDev.operatorName || 'Driver / Field Operator',
              assetId: newUnit || '',
              assetUnit: newUnit || '',
              status: 'online',
              lastSeen: serverDev.lastSeen || new Date().toISOString(),
              batteryPct: serverDev.batteryPct || 100,
              accuracyM: serverDev.accuracyM || 5,
              speedKph: serverDev.speedKph ?? 0,
              heading: serverDev.heading ?? 0,
              operationalStatus: serverDev.operationalStatus || 'Hauling',
              engineStatus: serverDev.engineStatus || 'Running',
              payloadT: serverDev.payloadT ?? 42,
              fuelPct: serverDev.fuelPct ?? 85,
              destination: serverDev.destination || 'Crusher Pad',
              assignment: serverDev.assignment || 'Pit North Haulage',
              tripsToday: serverDev.tripsToday ?? 0,
              sos: serverDev.sos ?? false,
              sosMessage: serverDev.sosMessage,
              lat: serverDev.lat || 0,
              lng: serverDev.lng || 0,
              trail: serverDev.trail || [],
              inviteCode: serverDev.code,
              createdAt: new Date().toISOString(),
            });
          }

          // Update linked fleet asset if exists
          const targetUnit = newUnit;
          if (targetUnit) {
            setFleet((prevFleet) => {
              const fIdx = prevFleet.findIndex((f) => f.unit === targetUnit || f.id === targetUnit);
              if (fIdx >= 0 && (serverDev.lat || serverDev.speedKph !== undefined)) {
                const copy = [...prevFleet];
                const existingAsset = copy[fIdx];
                copy[fIdx] = {
                  ...existingAsset,
                  lat: serverDev.lat ?? existingAsset.lat,
                  lng: serverDev.lng ?? existingAsset.lng,
                  speedKph: serverDev.speedKph ?? existingAsset.speedKph,
                  status: serverDev.operationalStatus ? (serverDev.operationalStatus as any) : existingAsset.status,
                  fuelPct: serverDev.fuelPct ?? existingAsset.fuelPct,
                  payloadT: serverDev.payloadT ?? existingAsset.payloadT,
                  destination: serverDev.destination || existingAsset.destination,
                  assignment: serverDev.assignment || existingAsset.assignment,
                  connectivity: 'Online',
                  lastUpdate: 'Just now',
                };
                return copy;
              }
              return prevFleet;
            });
          }
        }
        return updated;
      });
    };

    // 1. Fetch initial state
    fetch(apiUrl('/api/gps/devices'))
      .then((res) => (res.ok ? res.json() : { devices: [] }))
      .then((data) => {
        if (data.devices) processDevices(data.devices);
      })
      .catch(() => {});

    // 2. Setup Socket.io for Real-time pushes (Separate Service)
    const realtimeUrl = import.meta.env.VITE_REALTIME_URL || import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(realtimeUrl, {
      transports: ['websocket', 'polling'], // Fallback safely
    });

    socket.on('connect', () => {
      console.log('[OpsContext] Connected to Live Tracker Socket:', socket.id);
    });

    socket.on('gps-update', (deviceData: any) => {
      // Process the single device update pushed from backend
      processDevices([deviceData]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const mine = MINES.find((m) => m.id === mineId) ?? MINES[0];
  const shift = SHIFTS.find((s) => s.id === shiftId) ?? SHIFTS[0];

  const toastTimersRef = useRef(new Map<string, number>());

  const pushToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
    const existing = toastTimersRef.current.get(id);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      toastTimersRef.current.delete(id);
    }, 4200);
    toastTimersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const openModal = useCallback((m: Exclude<ModalKind, null>) => setModal(m), []);
  const closeModal = useCallback(() => setModal(null), []);

  const acknowledgeAlert = useCallback(
    (id: string) => {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
      pushToast({
        tone: 'success',
        title: 'Alert acknowledged',
        message: 'Logged to shift journal.',
      });
    },
    [pushToast],
  );

  const acknowledgeAll = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
    pushToast({ tone: 'success', title: 'All alerts acknowledged' });
  }, [pushToast]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const toggleFlagUnit = useCallback(
    (unit: string) => {
      setFlaggedUnits((prev) => {
        const next = new Set(prev);
        if (next.has(unit)) {
          next.delete(unit);
          pushToast({ tone: 'info', title: `${unit} unflagged` });
        } else {
          next.add(unit);
          pushToast({ tone: 'warning', title: `${unit} flagged for watch` });
        }
        return next;
      });
    },
    [pushToast],
  );

  const setMapLayer = useCallback((key: keyof MapLayers, value: boolean) => {
    setMapLayers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<OpsSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        savePrefs(next.locale, next.theme);
        applyTheme(next.theme);
        return next;
      });
      pushToast({
        tone: 'success',
        title: patch.locale === 'id' || settings.locale === 'id' ? 'Pengaturan disimpan' : 'Settings saved',
      });
    },
    [pushToast, settings.locale],
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let translated = translate(settings.locale, key);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          translated = translated.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return translated;
    },
    [settings.locale],
  );

  const openAssetDetail = useCallback((id: string) => {
    setSelectedAssetId(id);
    setActiveNav('equipment-detail');
  }, []);

  const exportCsv = useCallback(
    (filename: string, headers: string[], rows: (string | number)[][], title?: string) => {
      const content = buildCsv(headers, rows);
      const ok = triggerBrowserDownload(filename, content, 'text/csv;charset=utf-8');
      openModal({
        type: 'export-preview',
        filename,
        content,
        mime: 'text/csv;charset=utf-8',
        title: title ?? 'Export ready',
      });
      pushToast({
        tone: ok ? 'success' : 'warning',
        title: ok ? 'Export generated' : 'Download may be blocked',
        message: ok
          ? 'If the file is missing from Downloads, use Copy or Save in the export panel.'
          : 'Browser blocked the file save. Use Copy or Save in the export panel.',
      });
    },
    [openModal, pushToast],
  );

  // --- GPS Device Tracking ---
  const addGpsDevice = useCallback(
    (device: Omit<GpsDevice, 'id' | 'createdAt'>): GpsDevice => {
      const newDevice: GpsDevice = {
        ...device,
        id: `gps-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      setGpsDevices((prev) => [...prev, newDevice]);
      pushToast({ tone: 'success', title: 'Device added', message: newDevice.name });
      if (newDevice.inviteCode) {
        fetch(apiUrl('/api/gps/invite'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: newDevice.inviteCode,
            id: newDevice.id,
            name: newDevice.name,
            unitLabel: newDevice.assetUnit || newDevice.assetId,
          }),
        }).catch(() => {});
      }
      return newDevice;
    },
    [pushToast],
  );

  const removeGpsDevice = useCallback(
    (id: string) => {
      setGpsDevices((prev) => prev.filter((d) => d.id !== id));
      pushToast({ tone: 'info', title: 'Device removed' });
    },
    [pushToast],
  );

  const updateGpsDevicePosition = useCallback(
    (
      id: string,
      lat: number,
      lng: number,
      batteryPct?: number,
      accuracyM?: number
    ) => {
      setGpsDevices((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          const trailPoint = { lat, lng, ts: new Date().toISOString() };
          // Keep only last 24h trail (reset at shift change)
          const dayStart = new Date();
          dayStart.setHours(0, 0, 0, 0);
          const filteredTrail = d.trail.filter(
            (p) => new Date(p.ts) >= dayStart
          );
          return {
            ...d,
            lat,
            lng,
            status: 'online' as const,
            lastSeen: new Date().toISOString(),
            batteryPct: batteryPct ?? d.batteryPct,
            accuracyM: accuracyM ?? d.accuracyM,
            trail: [...filteredTrail, trailPoint].slice(-200), // cap points
          };
        })
      );
    },
    []
  );

  const generateDeviceInvite = useCallback(
    (deviceId: string): string => {
      const code = generateInviteCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      setGpsDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId ? { ...d, inviteCode: code, inviteExpiresAt: expiresAt } : d
        )
      );
      fetch(apiUrl('/api/gps/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, id: deviceId }),
      }).catch(() => {});
      pushToast({ tone: 'info', title: 'Invite link generated', message: `Valid 7 days` });
      // Use VITE_PUBLIC_URL if set (production), fallback to window.location.origin (dev)
      const baseUrl = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
      return `${baseUrl}/track/join?code=${code}`;
    },
    [pushToast],
  );

  const generateFullDeviceInvite = useCallback(
    async (payload: { operatorName: string; unitLabel: string; deviceName: string; armadaType: string }): Promise<{ url: string; code: string }> => {
      const code = generateInviteCode();
      const deviceId = `gps-${Date.now()}`;
      
      try {
        await fetch(apiUrl('/api/gps/invite'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
             code, 
             id: deviceId,
             operatorName: payload.operatorName,
             unitLabel: payload.unitLabel,
             name: payload.deviceName
          }),
        });
      } catch (err) {
        console.warn('Failed to pre-register invite to server:', err);
      }
      
      const baseUrl = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
      return { url: `${baseUrl}/track/join?code=${code}`, code };
    },
    []
  );

  const registerGpsDevice = useCallback(
    (code: string, payload: { fingerprint: string; platform: 'ios' | 'android'; lat: number; lng: number; accuracy: number }) => {
      const device = gpsDevices.find(d => d.inviteCode === code);
      if (!device) return false;

      const now = new Date().getTime();
      const expires = device.inviteExpiresAt ? new Date(device.inviteExpiresAt).getTime() : 0;
      if (expires && now > expires) return false;

      if (device.status === 'online' && device.registeredAt) return false;

      setGpsDevices((prev) =>
        prev.map((d) =>
          d.inviteCode === code
            ? {
                ...d,
                status: 'online',
                lastSeen: new Date().toISOString(),
                registeredAt: new Date().toISOString(),
                lat: payload.lat,
                lng: payload.lng,
                accuracyM: payload.accuracy,
                platform: payload.platform,
                trail: [{ lat: payload.lat, lng: payload.lng, ts: new Date().toISOString() }],
              }
            : d
        )
      );
      pushToast({ tone: 'success', title: 'Device registered', message: device.name });
      return true;
    },
    [gpsDevices, pushToast],
  );

  const resetDailyTrails = useCallback(() => {
    setGpsDevices((prev) =>
      prev.map((d) => ({ ...d, trail: [] }))
    );
    pushToast({ tone: 'info', title: 'Daily trails reset', message: 'All 24h motion trails cleared' });
  }, [pushToast]);

  const resetSingleDeviceTrail = useCallback((key: string) => {
    setGpsDevices((prev) =>
      prev.map((d) =>
        d.id === key || d.inviteCode === key || d.assetUnit === key || d.name === key || `GPS-${d.id}` === key
          ? { ...d, trail: [] }
          : d
      )
    );
    fetch(apiUrl('/api/gps/reset-trail'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: key, id: key }),
    }).catch(() => {});
    pushToast({ tone: 'info', title: 'Riwayat jejak di-reset', message: `Trail pergerakan untuk ${key} telah dibersihkan.` });
  }, [pushToast]);

  const alertCount = useMemo(() => alerts.filter((a) => !a.acknowledged).length, [alerts]);
  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const systemStatus: OpsContextValue['systemStatus'] = alerts.some(
    (a) => !a.acknowledged && a.severity === 'critical',
  )
    ? 'degraded'
    : 'operational';

  const value = useMemo<OpsContextValue>(
    () => ({
      activeNav,
      setActiveNav,
      collapsed,
      setCollapsed,
      toggleCollapsed: () => setCollapsed((c) => !c),
      mineId,
      setMineId,
      mine,
      shiftId,
      setShiftId,
      shift,
      mines: MINES,
      shifts: SHIFTS,
      globalQuery,
      setGlobalQuery,
      lastSync,
      systemStatus,
      toasts,
      pushToast,
      dismissToast,
      modal,
      openModal,
      closeModal,
      alerts,
      alertCount,
      acknowledgeAlert,
      acknowledgeAll,
      notifications,
      unreadNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      flaggedUnits,
      toggleFlagUnit,
      equipmentFilter,
      setEquipmentFilter,
      mapLayers,
      setMapLayer,
      settings,
      updateSettings,
      t,
      locale: settings.locale,
      theme: settings.theme,
      selectedEquipmentId,
      setSelectedEquipmentId,
      fleet,
      selectedAssetId,
      setSelectedAssetId,
      openAssetDetail,
      exportCsv,
      copilotOpen,
      setCopilotOpen,
      toggleCopilot: () => setCopilotOpen((o) => !o),
      copilotWidth,
      setCopilotWidth,
      // GPS Device Tracking
      gpsDevices,
      addGpsDevice,
      removeGpsDevice,
      updateGpsDevicePosition,
      generateDeviceInvite,
      generateFullDeviceInvite,
      registerGpsDevice,
      resetDailyTrails,
      resetSingleDeviceTrail,
    }),
    [
      activeNav,
      collapsed,
      mineId,
      mine,
      shiftId,
      shift,
      globalQuery,
      lastSync,
      systemStatus,
      toasts,
      pushToast,
      dismissToast,
      modal,
      openModal,
      closeModal,
      alerts,
      alertCount,
      acknowledgeAlert,
      acknowledgeAll,
      notifications,
      unreadNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      flaggedUnits,
      toggleFlagUnit,
      equipmentFilter,
      mapLayers,
      setMapLayer,
      settings,
      updateSettings,
      t,
      selectedEquipmentId,
      copilotOpen,
      copilotWidth,
      selectedAssetId,
      openAssetDetail,
      exportCsv,
      gpsDevices,
      addGpsDevice,
      removeGpsDevice,
      updateGpsDevicePosition,
      generateDeviceInvite,
      generateFullDeviceInvite,
      registerGpsDevice,
      resetDailyTrails,
      resetSingleDeviceTrail,
    ],
  );

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error('useOps must be used within OpsProvider');
  return ctx;
}
