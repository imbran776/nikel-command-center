import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  FileBarChart,
  HardHat,
  Instagram,
  LayoutDashboard,
  Mail,
  Radio,
  Settings,
  Shield,
  Truck,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOps } from '../contexts/OpsContext';
import type { NavItemId } from '../types/fms';

interface NavNode {
  id: NavItemId | 'group-ops' | 'group-assets' | 'group-insights' | 'group-admin';
  label: string;
  icon: typeof LayoutDashboard;
  badge?: 'alerts';
  children?: { id: NavItemId; label: string }[];
}

/** Final enterprise IA — Dashboard layout is final and not altered here */
const NAV: NavNode[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'group-ops',
    label: 'Operations',
    icon: Radio,
    children: [
      { id: 'live-ops', label: 'Live Operations' },
      { id: 'dispatch', label: 'Dispatch' },
    ],
  },
  { id: 'fleet', label: 'Fleet', icon: Truck },
  { id: 'production', label: 'Production', icon: BarChart3 },
  {
    id: 'group-assets',
    label: 'Assets',
    icon: HardHat,
    children: [
      { id: 'equipment', label: 'Equipment' },
      { id: 'maintenance', label: 'Maintenance' },
      { id: 'fuel', label: 'Fuel Management' },
      { id: 'spare-parts', label: 'Spare Parts' },
    ],
  },
  { id: 'operators', label: 'Operators', icon: Users },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: 'alerts' },
  {
    id: 'group-insights',
    label: 'Reports & Analytics',
    icon: FileBarChart,
    children: [
      { id: 'reports', label: 'Reports' },
      { id: 'analytics', label: 'Analytics' },
    ],
  },
  {
    id: 'group-admin',
    label: 'Administration',
    icon: Shield,
    children: [
      { id: 'users', label: 'User Management' },
      { id: 'roles', label: 'Roles & Permissions' },
      { id: 'settings', label: 'System Settings' },
      { id: 'audit-logs', label: 'Audit Logs' },
    ],
  },
];

function childActive(activeNav: NavItemId, childId: NavItemId) {
  if (activeNav === childId) return true;
  if (activeNav === 'equipment-detail' && childId === 'equipment') return true;
  return false;
}

export default function Sidebar({ alertCount }: { alertCount: number }) {
  const { activeNav, setActiveNav, collapsed, toggleCollapsed } = useOps();
  const { canAccess, user } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'group-ops': true,
    'group-assets': true,
    'group-insights': false,
    'group-admin': false,
  });

  const isChildActive = (children?: { id: NavItemId }[]) =>
    !!children?.some((c) => childActive(activeNav, c.id));

  const adminActive = useMemo(
    () => ['users', 'roles', 'settings', 'audit-logs'].includes(activeNav),
    [activeNav],
  );

  const visibleNav = useMemo(() => {
    return NAV.map((item) => {
      if (item.children) {
        const children = item.children.filter((c) => canAccess(c.id));
        if (!children.length) return null;
        return { ...item, children };
      }
      if (!canAccess(item.id as NavItemId)) return null;
      return item;
    }).filter(Boolean) as NavNode[];
  }, [canAccess]);

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-[#1E242A] bg-[#0D1116] transition-all duration-200 ${
        collapsed ? 'w-[64px]' : 'w-[220px]'
      }`}
    >
      {!collapsed && user && (
        <div className="mx-2.5 mt-2 rounded-lg border border-[#2A3036] bg-[#12171C] px-2.5 py-2">
          <div className="text-[11px] font-semibold text-[#E8ECEF]">{user.name}</div>
          <div className="text-[9px] text-[#6A737C]">
            {user.roleLabel} · {user.site}
          </div>
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pt-2 pb-2" aria-label="Primary">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          if (item.children) {
            const forceOpen =
              isChildActive(item.children) ||
              (item.id === 'group-admin' && adminActive);
            const open = openGroups[item.id] || forceOpen;
            return (
              <div key={item.id} className="mb-0.5">
                <button
                  type="button"
                  title={item.label}
                  onClick={() => {
                    if (collapsed) {
                      setActiveNav(item.children![0].id);
                      return;
                    }
                    setOpenGroups((g) => ({ ...g, [item.id]: !open }));
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[#8A949C] transition-colors hover:bg-[#141A1F] hover:text-[#C8D0D6] ${
                    collapsed ? 'justify-center' : ''
                  } ${forceOpen ? 'text-[#C8D0D6]' : ''}`}
                >
                  <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-[12px] font-medium">{item.label}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`}
                      />
                    </>
                  )}
                </button>
                {open && !collapsed && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[#1E242A] pl-2">
                    {item.children.map((child) => {
                      const active = childActive(activeNav, child.id);
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setActiveNav(child.id)}
                          className={`relative flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                            active
                              ? 'bg-[#1A2228] font-medium text-[#E8ECEF]'
                              : 'text-[#7A848C] hover:bg-[#141A1F] hover:text-[#C8D0D6]'
                          }`}
                        >
                          {active && (
                            <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-r bg-[#F6A214]" />
                          )}
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = activeNav === item.id;
          const badge = item.badge === 'alerts' ? alertCount : 0;

          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => setActiveNav(item.id as NavItemId)}
              className={`relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-[9px] text-left transition-colors ${
                isActive
                  ? 'bg-[#1A2228] text-[#E8ECEF]'
                  : 'text-[#8A949C] hover:bg-[#141A1F] hover:text-[#C8D0D6]'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[#F6A214]" />
              )}
              <Icon
                className={`h-[15px] w-[15px] shrink-0 ${
                  isActive ? 'text-[#E8ECEF]' : 'text-[#6A737C]'
                }`}
                strokeWidth={1.75}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 text-[13px] font-medium tracking-tight">{item.label}</span>
                  {item.id === 'dashboard' && isActive && (
                    <span className="rounded-full bg-[#3AC7A3] px-2 py-[2px] text-[10px] font-semibold leading-none text-[#0D1116]">
                      Active
                    </span>
                  )}
                  {badge > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D6403E] px-1 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#D6403E]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#1E242A]">
        <div className="flex items-center justify-between px-3 py-3">
          <button
            type="button"
            onClick={() => {
              if (canAccess('settings')) setActiveNav('settings');
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-[#6A737C] transition-colors hover:bg-[#161B20] hover:text-[#C8D0D6] ${
              activeNav === 'settings' ? 'bg-[#1A2228] text-[#1ADBDE]' : ''
            } ${!canAccess('settings') ? 'opacity-30' : ''}`}
            title={canAccess('settings') ? 'System Settings' : 'No settings access'}
            disabled={!canAccess('settings')}
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
          </button>
          {!collapsed && (
            <div className="flex items-center gap-1 text-[9px] text-[#4A545C]">
              <Activity className="h-3 w-3 text-[#3AC7A3]" />
              FMS ONLINE
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6A737C] transition-colors hover:bg-[#161B20] hover:text-[#C8D0D6]"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              strokeWidth={1.75}
            />
          </button>
        </div>

        {/* Developer credit — sits below Settings row at the very bottom of the rail */}
        {!collapsed ? (
          <div className="border-t border-[#1A1F24] px-3 py-2.5">
            <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#4A545C]">
              Developed by
            </div>
            <div className="mt-0.5 text-[11px] font-semibold text-[#C8D0D6]">Imbran Darwis</div>
            <a
              href="https://instagram.com/ranzxyz77"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#8A949C] transition-colors hover:text-[#1ADBDE]"
            >
              <Instagram className="h-3 w-3 shrink-0" />
              <span>@ranzxyz77</span>
            </a>
            <a
              href="mailto:imbrandarwis8@gmail.com"
              className="mt-1 flex items-center gap-1.5 text-[10px] text-[#8A949C] transition-colors hover:text-[#F6A214]"
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">imbrandarwis8@gmail.com</span>
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 border-t border-[#1A1F24] px-1 py-2">
            <a
              href="https://instagram.com/ranzxyz77"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram @ranzxyz77"
              className="rounded p-1 text-[#6A737C] hover:bg-[#161B20] hover:text-[#1ADBDE]"
            >
              <Instagram className="h-3.5 w-3.5" />
            </a>
            <a
              href="mailto:imbrandarwis8@gmail.com"
              title="imbrandarwis8@gmail.com"
              className="rounded p-1 text-[#6A737C] hover:bg-[#161B20] hover:text-[#F6A214]"
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
