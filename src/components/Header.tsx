import {
  Activity,
  Bell,
  Calendar,
  ChevronDown,
  Command,
  LogOut,
  Plus,
  Radio,
  Search,
  Settings,
  UserRound,
  Wrench,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOps } from '../contexts/OpsContext';
import { useClock } from '../hooks/useClock';
import Button from './ui/Button';
import DropdownMenu from './ui/DropdownMenu';
import ProfileEditorModal from './ui/ProfileEditorModal';
import UserAvatar from './ui/UserAvatar';

function ExcavatorMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 18h12v2H3v-2Zm2-6h7l1.5 4H4.5L5 12Zm9.5-1 3-5h2l-2 5h3l1 2h-7l0-2Z"
        fill="currentColor"
      />
      <path d="M14 11c2.5-1 5-4 6.5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7" cy="19" r="1.3" fill="currentColor" opacity="0.5" />
      <circle cx="13" cy="19" r="1.3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export default function Header() {
  const clock = useClock();
  const { user, logout, canAccess, updateCurrentUser } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const {
    settings,
    alertCount,
    setActiveNav,
    openModal,
    pushToast,
    mine,
    mines,
    mineId,
    setMineId,
    shift,
    shifts,
    shiftId,
    setShiftId,
    globalQuery,
    setGlobalQuery,
    lastSync,
    systemStatus,
    notifications,
    unreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    fleet,
    openAssetDetail,
    t,
  } = useOps();

  const [notifOpen, setNotifOpen] = useState(false);

  const syncLabel = useMemo(() => {
    const s = Math.max(0, Math.floor((Date.now() - lastSync.getTime()) / 1000));
    if (s < 5) return 'Just now';
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  }, [lastSync, clock]);

  const statusColor =
    systemStatus === 'operational'
      ? '#3AC7A3'
      : systemStatus === 'degraded'
        ? '#F6A214'
        : '#D6403E';

  const runGlobalSearch = () => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return;
    const hit = fleet.find(
      (f) =>
        f.unit.toLowerCase().includes(q) ||
        f.operator.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q),
    );
    if (hit) {
      openAssetDetail(hit.id);
      pushToast({ tone: 'success', title: `Found ${hit.unit}`, message: hit.assignment });
    } else if (q.includes('alert')) {
      setActiveNav('alerts');
    } else {
      setActiveNav('fleet');
      pushToast({ tone: 'info', title: 'Search', message: `No direct match for “${globalQuery}”. Showing fleet.` });
    }
  };

  return (
    <header className="absolute inset-x-0 top-0 z-40 flex h-[56px] items-center gap-3 border-b border-[#1E242A] bg-[#0D1116]/96 px-3 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setActiveNav('dashboard')}
        className="flex shrink-0 items-center gap-2 rounded-md text-left"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1A2026] ring-1 ring-[#2A3036]">
          <ExcavatorMark className="h-5 w-5 text-[#F6A214]" />
        </div>
        <div className="hidden min-w-0 lg:block">
          <div className="truncate text-[12px] font-semibold tracking-[0.06em] text-[#E8ECEF]">
            MINING COMMAND
          </div>
          <div className="truncate text-[10px] text-[#6A737C]">Central Operations FMS</div>
        </div>
      </button>

      {/* Mine + Shift selectors */}
      <div className="hidden items-center gap-1.5 md:flex">
        <SelectChip
          label="Mine"
          value={mineId}
          options={mines.map((m) => ({ value: m.id, label: m.name }))}
          onChange={(v) => {
            setMineId(v);
            pushToast({ tone: 'info', title: 'Mine context', message: mines.find((m) => m.id === v)?.name });
          }}
        />
        <SelectChip
          label="Shift"
          value={shiftId}
          options={shifts.map((s) => ({ value: s.id, label: s.code }))}
          onChange={(v) => {
            setShiftId(v);
            const s = shifts.find((x) => x.id === v);
            pushToast({ tone: 'info', title: 'Shift selected', message: s?.label });
          }}
        />
      </div>

      {/* Global search */}
      <div className="relative mx-1 hidden min-w-0 flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5A636C]" />
        <input
          id="header-global-search"
          name="globalSearch"
          type="search"
          value={globalQuery}
          onChange={(e) => setGlobalQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runGlobalSearch()}
          placeholder="Search unit, operator, location…"
          aria-label="Search unit, operator, location"
          className="h-8 w-full rounded-md border border-[#2A3036] bg-[#12171C] py-1.5 pl-8 pr-16 text-[12px] text-[#E8ECEF] outline-none placeholder:text-[#5A636C] focus:border-[#1ADBDE]/50"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-[#2A3036] px-1.5 py-0.5 text-[9px] text-[#5A636C] sm:inline-flex">
          <Command className="h-2.5 w-2.5" /> K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Current shift + sync */}
        <div className="hidden items-center gap-3 rounded-md border border-[#2A3036] bg-[#12171C] px-2.5 py-1 xl:flex">
          <div className="flex items-center gap-1.5 text-[11px] text-[#8A949C]">
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden 2xl:inline">{clock}</span>
            <span className="text-[#C8D0D6]">{shift.code}</span>
          </div>
          <div className="h-3 w-px bg-[#2A3036]" />
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            <span className="text-[#A8B0B7] capitalize">{systemStatus}</span>
            <span className="text-[#5A636C]">· sync {syncLabel}</span>
          </div>
        </div>

        {/* Quick actions */}
        <DropdownMenu
          trigger={
            <Button variant="outline" size="sm" leftIcon={<Zap className="h-3.5 w-3.5 text-[#F6A214]" />}>
              <span className="hidden sm:inline">Quick</span>
            </Button>
          }
          items={[
            {
              id: 'dispatch',
              label: 'New dispatch',
              icon: <Plus className="h-3.5 w-3.5" />,
              onSelect: () => {
                setActiveNav('dispatch');
                openModal({ type: 'assign' });
              },
            },
            {
              id: 'wo',
              label: 'Create work order',
              icon: <Wrench className="h-3.5 w-3.5" />,
              onSelect: () => openModal({ type: 'service', unit: 'HT-04', driver: 'L. Wang' }),
            },
            {
              id: 'radio',
              label: 'Open radio channel',
              icon: <Radio className="h-3.5 w-3.5" />,
              onSelect: () => openModal({ type: 'radio', unit: 'HT-04', driver: 'L. Wang' }),
            },
          ]}
        />

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-[#8A949C] transition-colors hover:bg-[#1A2026] hover:text-[#E8ECEF]"
            aria-label="Notification center"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#D6403E] px-0.5 text-[8px] font-bold text-white">
                {unreadNotifications}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close notifications"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-[#2A3036] bg-[#151A1F] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#2A3036] px-3 py-2">
                  <span className="text-[12px] font-semibold text-[#E8ECEF]">Notifications</span>
                  <button
                    type="button"
                    className="text-[10px] text-[#1ADBDE] hover:underline"
                    onClick={markAllNotificationsRead}
                  >
                    Mark all read
                  </button>
                </div>
                <ul className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          markNotificationRead(n.id);
                          if (n.severity === 'critical') setActiveNav('alerts');
                          setNotifOpen(false);
                        }}
                        className={`w-full border-b border-[#1E242A] px-3 py-2.5 text-left hover:bg-[#1A2026] ${
                          n.read ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-medium text-[#E8ECEF]">{n.title}</span>
                          <span className="text-[9px] text-[#5A636C]">{n.time}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#8A949C]">{n.body}</p>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNav('alerts');
                    setNotifOpen(false);
                  }}
                  className="w-full border-t border-[#2A3036] py-2 text-center text-[11px] font-semibold text-[#1ADBDE] hover:bg-[#1A2026]"
                >
                  Open alerts center ({alertCount})
                </button>
              </div>
            </>
          )}
        </div>

        {/* System status mobile */}
        <div className="flex h-8 items-center gap-1 rounded-md px-1.5 xl:hidden" title={`System ${systemStatus}`}>
          <Activity className="h-3.5 w-3.5" style={{ color: statusColor }} />
        </div>

        {/* Profile */}
        <DropdownMenu
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-[#1A2026]"
            >
              <UserAvatar
                name={user?.name ?? settings.opsLead}
                initials={user?.avatarInitials}
                src={user?.avatarUrl}
                size="md"
              />
              <div className="hidden text-left md:block">
                <div className="text-[11px] font-medium text-[#E8ECEF]">{user?.name ?? settings.opsLead}</div>
                <div className="text-[9px] text-[#6A737C]">
                  {user?.roleLabel ?? 'Operator'} · {mine.code}
                </div>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-[#5A636C] md:block" />
            </button>
          }
          items={[
            {
              id: 'profile',
              label: t('header.profile'),
              icon: <UserRound className="h-3.5 w-3.5" />,
              onSelect: () => {
                if (user) setProfileOpen(true);
                else
                  pushToast({
                    tone: 'info',
                    title: settings.opsLead,
                    message: `${mine.name} · ${shift.label}`,
                  });
              },
            },
            ...(canAccess('settings')
              ? [
                  {
                    id: 'settings',
                    label: t('header.settings'),
                    icon: <Settings className="h-3.5 w-3.5" />,
                    onSelect: () => setActiveNav('settings'),
                  },
                ]
              : []),
            {
              id: 'signout',
              label: t('header.signOut'),
              icon: <LogOut className="h-3.5 w-3.5" />,
              danger: true,
              onSelect: () => {
                pushToast({
                  tone: 'warning',
                  title: t('header.sessionEnded'),
                  message: `${user?.name ?? 'Operator'} signed out of FMS.`,
                });
                logout();
              },
            },
          ]}
        />
      </div>

      {profileOpen && user && (
        <ProfileEditorModal
          user={user}
          title="My profile"
          onClose={() => setProfileOpen(false)}
          onSave={(patch) => {
            updateCurrentUser(patch);
            pushToast({
              tone: 'success',
              title: 'Profile saved',
              message: 'Name and photo updated for this browser session.',
            });
            setProfileOpen(false);
          }}
        />
      )}
    </header>
  );
}

function SelectChip({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const chipId = `select-chip-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <label htmlFor={chipId} className="flex h-8 items-center gap-1.5 rounded-md border border-[#2A3036] bg-[#12171C] px-2">
      <span className="text-[9px] font-semibold tracking-wider text-[#5A636C]">{label}</span>
      <select
        id={chipId}
        name={label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[110px] bg-transparent text-[11px] font-medium text-[#C8D0D6] outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#151A1F]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
