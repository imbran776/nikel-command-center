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
import { ALERTS, FLEET, MINES, NOTIFICATIONS, SHIFTS } from '../data/enterprise';
import { buildCsv, triggerBrowserDownload } from '../lib/export';
import {
  applyTheme,
  loadPrefs,
  savePrefs,
  t as translate,
  type Locale,
  type ThemeMode,
} from '../lib/i18n';
import type {
  EquipmentRow,
  FleetAsset,
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

interface OpsContextValue {
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
  /** Translate UI string by key using current locale */
  t: (key: string) => string;
  locale: Locale;
  theme: ThemeMode;

  selectedEquipmentId: string | null;
  setSelectedEquipmentId: (id: string | null) => void;

  fleet: FleetAsset[];
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  openAssetDetail: (id: string) => void;

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
  const prefs = loadPrefs();
  const [settings, setSettings] = useState<OpsSettings>({
    autoRefresh: true,
    soundAlerts: true,
    highContrast: false,
    unitsMetric: true,
    shiftCode: 'SHIFT-B',
    siteCode: 'PIT-N',
    opsLead: 'Alex R.',
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

  const t = useCallback((key: string) => translate(settings.locale, key), [settings.locale]);

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
      fleet: FLEET,
      selectedAssetId,
      setSelectedAssetId,
      openAssetDetail,
      exportCsv,
      copilotOpen,
      setCopilotOpen,
      toggleCopilot: () => setCopilotOpen((o) => !o),
      copilotWidth,
      setCopilotWidth,
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
    ],
  );

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error('useOps must be used within OpsProvider');
  return ctx;
}
