import PageShell, { StatTile } from '../components/ui/PageShell';
import Button from '../components/ui/Button';
import { useOps } from '../contexts/OpsContext';

const ROLES = [
  {
    id: 'ops-lead',
    name: 'Ops Lead',
    users: 2,
    perms: ['Dashboard', 'Operations', 'Dispatch', 'Fleet', 'Alerts', 'Reports'],
  },
  {
    id: 'dispatcher',
    name: 'Dispatcher',
    users: 4,
    perms: ['Dashboard', 'Live Operations', 'Dispatch', 'Fleet (read)', 'Alerts'],
  },
  {
    id: 'maint',
    name: 'Maintenance Supervisor',
    users: 3,
    perms: ['Equipment', 'Maintenance', 'Spare Parts', 'Fuel', 'Alerts'],
  },
  {
    id: 'analyst',
    name: 'Production Analyst',
    users: 2,
    perms: ['Production', 'Reports', 'Analytics', 'Dashboard (read)'],
  },
  {
    id: 'admin',
    name: 'System Admin',
    users: 1,
    perms: ['All modules', 'User Management', 'Roles', 'Audit Logs', 'System Settings'],
  },
];

export default function RolesPage() {
  const { pushToast } = useOps();

  return (
    <PageShell
      title="ROLES & PERMISSIONS"
      subtitle="Role-based access control for FMS modules"
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            pushToast({
              tone: 'info',
              title: 'Create role',
              message: 'RBAC editor will connect to auth service.',
            })
          }
        >
          New role
        </Button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        <StatTile label="ROLES" value={ROLES.length} tone="cyan" />
        <StatTile label="ASSIGNED USERS" value={ROLES.reduce((s, r) => s + r.users, 0)} tone="green" />
        <StatTile label="MODULES COVERED" value={12} />
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {ROLES.map((role) => (
          <div
            key={role.id}
            className="rounded-lg border border-[#2A3036] bg-[#12171C] p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[13px] font-semibold text-[#E8ECEF]">{role.name}</h3>
                <p className="mt-0.5 text-[11px] text-[#6A737C]">{role.users} users assigned</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  pushToast({ tone: 'info', title: role.name, message: `Access level: ${role.perms.join(', ')}` })
                }
              >
                Edit
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {role.perms.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-[#2A3036] bg-[#0D1116] px-2 py-0.5 text-[10px] text-[#A8B0B7]"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
