import DataTable, { type Column } from '../components/ui/DataTable';
import PageShell, { StatTile } from '../components/ui/PageShell';
import StatusBadge from '../components/ui/StatusBadge';
import { useOps } from '../contexts/OpsContext';
import { OPERATORS } from '../data/enterprise';
import type { Operator } from '../types/fms';

export default function OperatorsPage() {
  const { pushToast, setActiveNav } = useOps();

  const columns: Column<Operator>[] = [
    { key: 'name', header: 'OPERATOR', sortable: true, sortValue: (r) => r.name, render: (r) => <span className="font-semibold text-[#E8ECEF]">{r.name}</span> },
    { key: 'role', header: 'ROLE', render: (r) => <span className="text-[#8A949C]">{r.role}</span> },
    { key: 'shift', header: 'SHIFT', render: (r) => r.shift },
    { key: 'unit', header: 'ASSIGNED', sortable: true, sortValue: (r) => r.assignedUnit, render: (r) => <span className="font-mono text-[#1ADBDE]">{r.assignedUnit}</span> },
    { key: 'hrs', header: 'HOURS', sortable: true, sortValue: (r) => r.hoursToday, render: (r) => `${r.hoursToday} h` },
    { key: 'att', header: 'ATTENDANCE', render: (r) => <StatusBadge value={r.attendance === 'On Site' ? 'Active' : r.attendance === 'Break' ? 'Waiting' : 'Idle'} /> },
    {
      key: 'perf',
      header: 'PERFORMANCE',
      sortable: true,
      sortValue: (r) => r.performance,
      render: (r) => (
        <span style={{ color: r.performance >= 90 ? '#3AC7A3' : r.performance >= 85 ? '#1ADBDE' : '#F6A214' }}>
          {r.performance}
        </span>
      ),
    },
    {
      key: 'safe',
      header: 'SAFETY',
      sortable: true,
      sortValue: (r) => r.safetyScore,
      render: (r) => <span className="text-[#3AC7A3]">{r.safetyScore}</span>,
    },
    {
      key: 'cert',
      header: 'CERTIFICATIONS',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.certifications.map((c) => (
            <span key={c} className="rounded bg-[#1A2428] px-1.5 py-0.5 text-[9px] text-[#A8B0B7]">
              {c}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'lic', header: 'LICENSE EXP', render: (r) => r.licenseExp },
  ];

  return (
    <PageShell
      title="OPERATORS"
      subtitle="Profiles · shift · assignment · performance · safety · certifications"
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="ON SITE" value={OPERATORS.filter((o) => o.attendance === 'On Site').length} tone="green" />
        <StatTile label="AVG PERFORMANCE" value={Math.round(OPERATORS.reduce((s, o) => s + o.performance, 0) / OPERATORS.length)} tone="cyan" />
        <StatTile label="AVG SAFETY" value={Math.round(OPERATORS.reduce((s, o) => s + o.safetyScore, 0) / OPERATORS.length)} tone="green" />
        <StatTile label="HOURS LOGGED" value={`${OPERATORS.reduce((s, o) => s + o.hoursToday, 0).toFixed(1)} h`} />
      </div>
      <DataTable
        rows={OPERATORS}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search operator or unit…"
        searchFn={(r, q) =>
          r.name.toLowerCase().includes(q) ||
          r.assignedUnit.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q)
        }
        onRowClick={(r) =>
          pushToast({
            tone: 'info',
            title: r.name,
            message: `${r.role} · ${r.phone} · assigned ${r.assignedUnit}`,
          })
        }
        toolbar={
          <button
            type="button"
            className="text-[11px] text-[#1ADBDE] hover:underline"
            onClick={() => setActiveNav('fleet')}
          >
            View fleet assignments
          </button>
        }
      />
    </PageShell>
  );
}
