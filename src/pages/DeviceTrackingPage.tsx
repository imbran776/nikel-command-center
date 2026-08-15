import {
  AlertCircle,
  CheckCircle,
  Copy,
  Globe,
  Loader2,
  MoreVertical,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  Smartphone,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import DropdownMenu from '../components/ui/DropdownMenu';
import PageShell from '../components/ui/PageShell';
import StatusBadge from '../components/ui/StatusBadge';
import { useOps } from '../contexts/OpsContext';
import { GpsDevice, DeviceStatusFilter } from '../types/fms';
import { PLATFORM_ICONS, STATUS_LABELS, TYPE_LABELS } from '../lib/constants';
import { toast } from 'sonner';

const pushToast = (options: { tone: 'success' | 'info' | 'warning' | 'error'; title: string; message?: string }) => {
  toast[options.tone](options.title, { description: options.message });
};

export default function DeviceTrackingPage() {
  const {
    gpsDevices,
    generateDeviceInvite,
    addGpsDevice,
    updateGpsDevicePosition,
    removeGpsDevice,
    resetDailyTrails,
    t,
  } = useOps();

  const [statusFilter, setStatusFilter] = useState<DeviceStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addingDevice, setAddingDevice] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({
    name: '',
    type: 'phone' as 'phone' | 'beacon',
    platform: 'android' as 'ios' | 'android' | 'ble',
    ownerId: '',
    ownerName: '',
    assetId: '',
    assetUnit: '',
  });
  const [qrDevice, setQrDevice] = useState<GpsDevice | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  const filteredDevices = useMemo(() => {
    return gpsDevices.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      const q = searchQuery.toLowerCase();
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !d.ownerName.toLowerCase().includes(q) &&
        !d.assetUnit?.toLowerCase().includes(q) &&
        !d.id.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [gpsDevices, statusFilter, searchQuery]);

  const statusFilters: DeviceStatusFilter[] = ['all', 'online', 'offline', 'stale'];

  const handleAddDevice = () => {
    const { name, type, platform, ownerName, assetUnit } = newDeviceForm;
    if (!name || !ownerName) {
      pushToast({ tone: 'warning', title: t('deviceTracking.missingFields'), message: t('deviceTracking.nameOwnerRequired') });
      return;
    }
    const device: Omit<GpsDevice, 'id' | 'createdAt'> = {
      name,
      type,
      platform,
      ownerId: 'user_1',
      ownerName,
      assetId: '',
      assetUnit: assetUnit || '',
      status: 'offline',
      lastSeen: new Date().toISOString(),
      batteryPct: 100,
      accuracyM: 0,
      lat: 0,
      lng: 0,
      trail: [],
      registeredAt: new Date().toISOString(),
    };
    addGpsDevice(device);
    setAddingDevice(false);
    setNewDeviceForm({
      name: '',
      type: 'phone',
      platform: 'android',
      ownerId: '',
      ownerName: '',
      assetId: '',
      assetUnit: '',
    });
    pushToast({ tone: 'success', title: t('deviceTracking.deviceAdded'), message: name });
  };

  const handleGenerateInvite = (deviceId: string) => {
    const url = generateDeviceInvite(deviceId);
    navigator.clipboard.writeText(url);
    pushToast({ tone: 'success', title: t('deviceTracking.inviteGenerated'), message: url });
  };

  const getInviteUrl = (device: GpsDevice): string => {
    const baseUrl = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
    return device.inviteCode ? `${baseUrl}/track/join?code=${device.inviteCode}` : '';
  };

  const handleCopyInvite = (device: GpsDevice) => {
    const url = getInviteUrl(device);
    if (url) {
      navigator.clipboard.writeText(url);
      pushToast({ tone: 'success', title: t('deviceTracking.inviteCopied'), message: url });
    }
  };

  const handleShowQR = (device: GpsDevice) => {
    const url = getInviteUrl(device);
    if (!url) return;
    setQrDevice(device);
    setQrUrl(url);
    setShowQrModal(true);
  };

  const handleShareInvite = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mining Command - Device Invite', text: url, url });
        return;
      } catch {
        // fall back to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    pushToast({ tone: 'success', title: t('deviceTracking.inviteCopied'), message: url });
  };

  const handleRemoveDevice = (id: string) => {
    if (window.confirm(t('deviceTracking.confirmRemove'))) {
      removeGpsDevice(id);
      pushToast({ tone: 'info', title: t('deviceTracking.deviceRemoved') });
    }
  };

  const handleResetTrails = () => {
    if (window.confirm(t('deviceTracking.confirmReset'))) {
      resetDailyTrails();
      pushToast({ tone: 'info', title: t('deviceTracking.trailsReset') });
    }
  };

  const columns = [
    {
      key: 'name',
      header: t('deviceTracking.title'),
      sortable: true,
      sortValue: (r: GpsDevice) => r.name,
      render: (r: GpsDevice) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{PLATFORM_ICONS[r.platform]}</span>
          <div>
            <div className="font-mono font-semibold text-[#E8ECEF]">{r.name}</div>
            <div className="text-[10px] text-[#6A737C]">{r.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('deviceTracking.type'),
      sortable: true,
      sortValue: (r: GpsDevice) => r.type,
      render: (r: GpsDevice) => <StatusBadge value={t(TYPE_LABELS[r.type])} />,
    },
    {
      key: 'owner',
      header: t('deviceTracking.owner'),
      sortable: true,
      sortValue: (r: GpsDevice) => r.ownerName,
      render: (r: GpsDevice) => (
        <div>
          <div className="text-[#E8ECEF]">{r.ownerName}</div>
          <div className="text-[10px] text-[#6A737C]">{r.assetUnit ? `Asset: ${r.assetUnit}` : 'Unassigned'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('deviceTracking.status'),
      sortable: true,
      sortValue: (r: GpsDevice) => r.status,
      render: (r: GpsDevice) => <StatusBadge value={t(STATUS_LABELS[r.status])} />,
    },
    {
      key: 'battery',
      header: t('deviceTracking.battery'),
      sortable: true,
      sortValue: (r: GpsDevice) => r.batteryPct ?? 0,
      render: (r: GpsDevice) => (
        <div className="flex items-center gap-1.5">
          <div className="relative w-10 h-4">
            <div
              className={`absolute inset-0 rounded bg-[${r.batteryPct && r.batteryPct > 50 ? '#1ADBDE' : r.batteryPct && r.batteryPct > 20 ? '#FFB800' : '#FF4444'}] transition-all`}
              style={{ width: `${r.batteryPct ?? 0}%` }}
            />
            <div className="absolute inset-0 rounded border border-[#2A3036]" />
          </div>
          <span className="text-[11px] font-mono text-[#C8D0D6]">{(r.batteryPct ?? 0)}%</span>
        </div>
      ),
    },
    {
      key: 'accuracy',
      header: t('deviceTracking.accuracy'),
      sortable: true,
      sortValue: (r: GpsDevice) => r.accuracyM ?? 0,
      render: (r: GpsDevice) => (
        <span className="font-mono text-[11px] text-[#C8D0D6]">{r.accuracyM && r.accuracyM > 0 ? `${r.accuracyM.toFixed(1)}m` : '--'}</span>
      ),
    },
    {
      key: 'lastSeen',
      header: t('deviceTracking.lastSeen'),
      sortable: true,
      sortValue: (r: GpsDevice) => new Date(r.lastSeen).getTime(),
      render: (r: GpsDevice) => (
        <span className="font-mono text-[11px] text-[#C8D0D6]">
          {r.lastSeen ? new Date(r.lastSeen).toLocaleTimeString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'position',
      header: t('deviceTracking.position'),
      render: (r: GpsDevice) =>
        r.lat && r.lng ? (
          <span className="font-mono text-[11px] text-[#C8D0D6]">{r.lat.toFixed(6)}, {r.lng.toFixed(6)}</span>
        ) : (
          <span className="text-[11px] text-[#6A737C]">--</span>
        ),
    },
    {
      key: 'trail',
      header: t('deviceTracking.trail'),
      render: (r: GpsDevice) => (
        <StatusBadge value={`${r.trail.length} ${t('deviceTracking.points')}`} />
      ),
    },
    {
      key: 'actions',
      header: t('deviceTracking.actions'),
      render: (r: GpsDevice) => (
        <div className="flex items-center gap-1">
          <DropdownMenu
            trigger={
              <button
                type="button"
                className="rounded-lg p-1.5 text-[#8A949C] transition-colors hover:bg-[#1A2026] hover:text-[#E8ECEF]"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            }
            items={[
              {
                id: 'invite',
                label: r.inviteCode ? t('deviceTracking.copyInvite') : t('deviceTracking.generateInvite'),
                icon: <Share2 className="h-3.5 w-3.5" />,
                onSelect: () => (r.inviteCode ? handleCopyInvite(r) : handleGenerateInvite(r.id)),
              },
              {
                id: 'qr',
                label: t('deviceTracking.showQR'),
                icon: <QrCode className="h-3.5 w-3.5" />,
                onSelect: () => handleShowQR(r),
              },
              {
                id: 'refresh',
                label: t('deviceTracking.simulatePosition'),
                icon: <RefreshCw className="h-3.5 w-3.5" />,
                onSelect: () => {
                  const lat = r.lat + (Math.random() - 0.5) * 0.002;
                  const lng = r.lng + (Math.random() - 0.5) * 0.002;
                  updateGpsDevicePosition(r.id, lat, lng, r.batteryPct, r.accuracyM);
                  pushToast({ tone: 'info', title: t('deviceTracking.inviteGenerated'), message: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
                },
              },
              {
                id: 'delete',
                label: t('deviceTracking.removeDevice'),
                icon: <Trash2 className="h-3.5 w-3.5" />,
                danger: true,
                onSelect: () => handleRemoveDevice(r.id),
              },
            ]}
            widthClass="w-44"
          />
        </div>
      ),
    },
  ];

  // QR Code Modal - render early if open
  if (showQrModal && qrDevice && qrUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowQrModal(false)}>
        <div className="w-full max-w-sm rounded-xl border border-[#2A3036] bg-[#12171C] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#E8ECEF]">{t('deviceTracking.qrTitle')}</h3>
            <button onClick={() => setShowQrModal(false)} className="text-[#6A737C] hover:text-[#E8ECEF]">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG value={qrUrl} size={200} level="M" includeMargin={true} />
            </div>
            <div className="text-center">
              <p className="text-sm font-mono text-[#1ADBDE] break-all">{qrDevice.name}</p>
              <p className="text-[10px] text-[#6A737C] mt-1">{qrUrl}</p>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl);
                  pushToast({ tone: 'success', title: t('deviceTracking.inviteCopied'), message: qrUrl });
                }}
                className="flex-1 rounded-lg border border-[#2A3036] bg-[#0D1116] px-3 py-2 text-sm font-semibold text-[#E8ECEF] hover:border-[#1ADBDE]/50"
              >
                <Copy className="h-4 w-4 inline-block mr-1" /> {t('deviceTracking.copyLink')}
              </button>
              <button
                onClick={() => {
                  void handleShareInvite(qrUrl);
                }}
                className="flex-1 rounded-lg bg-[#1ADBDE] px-3 py-2 text-sm font-bold text-[#0D1116] hover:bg-[#4AE5E8]"
              >
                <Share2 className="h-4 w-4 inline-block mr-1" /> {t('deviceTracking.share')}
              </button>
            </div>
            <p className="text-[10px] text-[#5A636C] text-center">
              Scan dengan kamera HP / aplikasi QR scanner untuk mendaftarkan perangkat GPS
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageShell
      title={t('deviceTracking.title')}
      subtitle={t('deviceTracking.subtitle', { count: gpsDevices.length })}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={handleResetTrails}>
            {t('deviceTracking.resetTrails')}
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddingDevice(true)}>
            {t('deviceTracking.addDevice')}
          </Button>
        </div>
      }
    >
      {/* Add Device Modal */}
      {addingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-lg border border-[#2A3036] bg-[#12171C] p-4">
            <h3 className="mb-4 text-[13px] font-semibold text-[#E8ECEF]">{t('deviceTracking.addDeviceTitle')}</h3>
            <div className="space-y-3">
              <input
                id="dev-track-name"
                name="deviceName"
                aria-label={t('deviceTracking.deviceName')}
                placeholder={t('deviceTracking.deviceName')}
                value={newDeviceForm.name}
                onChange={(e) => setNewDeviceForm({ ...newDeviceForm, name: e.target.value })}
                className="w-full rounded-md border border-[#2A3036] bg-[#0D1116] px-3 py-2 text-[#E8ECEF] placeholder-[#5A636C] focus:border-[#1ADBDE] focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  id="dev-track-type"
                  name="deviceType"
                  aria-label={t('deviceTracking.typePhone')}
                  value={newDeviceForm.type}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, type: e.target.value as 'phone' | 'beacon' })}
                  className="rounded-md border border-[#2A3036] bg-[#0D1116] px-3 py-2 text-[#E8ECEF] focus:border-[#1ADBDE] focus:outline-none"
                >
                  <option value="phone">{t('deviceTracking.typePhone')}</option>
                  <option value="beacon">{t('deviceTracking.typeBeacon')}</option>
                </select>
                <select
                  id="dev-track-platform"
                  name="devicePlatform"
                  aria-label="Device Platform"
                  value={newDeviceForm.platform}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, platform: e.target.value as 'ios' | 'android' | 'ble' })}
                  className="rounded-md border border-[#2A3036] bg-[#0D1116] px-3 py-2 text-[#E8ECEF] focus:border-[#1ADBDE] focus:outline-none"
                >
                  <option value="android">Android</option>
                  <option value="ios">iOS</option>
                  <option value="ble">BLE Beacon</option>
                </select>
              </div>
              <input
                id="dev-track-owner"
                name="ownerName"
                aria-label={t('deviceTracking.ownerName')}
                placeholder={t('deviceTracking.ownerName')}
                value={newDeviceForm.ownerName}
                onChange={(e) => setNewDeviceForm({ ...newDeviceForm, ownerName: e.target.value })}
                className="w-full rounded-md border border-[#2A3036] bg-[#0D1116] px-3 py-2 text-[#E8ECEF] placeholder-[#5A636C] focus:border-[#1ADBDE] focus:outline-none"
              />
              <input
                id="dev-track-asset-unit"
                name="assetUnit"
                aria-label={t('deviceTracking.assetUnit')}
                placeholder={t('deviceTracking.assetUnit')}
                value={newDeviceForm.assetUnit}
                onChange={(e) => setNewDeviceForm({ ...newDeviceForm, assetUnit: e.target.value })}
                className="w-full rounded-md border border-[#2A3036] bg-[#0D1116] px-3 py-2 text-[#E8ECEF] placeholder-[#5A636C] focus:border-[#1ADBDE] focus:outline-none"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAddingDevice(false)}>
                {t('deviceTracking.cancel')}
              </Button>
              <Button variant="primary" size="sm" onClick={handleAddDevice}>
                {t('deviceTracking.add')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#4A545C]" />
          <input
            id="dev-track-search"
            name="deviceSearch"
            type="search"
            aria-label={t('deviceTracking.search')}
            placeholder={t('deviceTracking.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[#2A3036] bg-[#0D1116] pl-8 pr-3 py-2 text-[#E8ECEF] placeholder-[#5A636C] focus:border-[#1ADBDE] focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {statusFilters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
                statusFilter === s
                  ? 'bg-[#1ADBDE] text-[#0D1116]'
                  : 'bg-[#1A2026] text-[#8A949C] hover:text-[#C8D0D6]'
              }`}
            >
              {s === 'all' ? t('deviceTracking.all') : t('deviceTracking.' + s)}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-[#2A3036] bg-[#12171C] px-3 py-2 text-[11px]">
          <span className="text-[#C8D0D6]">{selected.size} selected</span>
          <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <DataTable
        rows={filteredDevices}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder={t('deviceTracking.search')}
        searchFn={(r, q) =>
          r.name.toLowerCase().includes(q) ||
          r.ownerName.toLowerCase().includes(q) ||
          r.assetUnit?.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        }
        onRowClick={() => {}}
        selectable
        selectedIds={selected}
        onToggleSelect={(id) =>
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        onToggleSelectAll={(ids) =>
          setSelected((prev) => {
            const all = ids.every((id) => prev.has(id));
            const next = new Set(prev);
            ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
            return next;
          })
        }
        emptyTitle="No devices match"
      />
    </PageShell>
  );
}