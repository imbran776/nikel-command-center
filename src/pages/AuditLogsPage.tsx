import DataTable, { type Column } from '../components/ui/DataTable';
import PageShell, { StatTile } from '../components/ui/PageShell';

interface AuditRow {
  id: string;
  time: string;
  actor: string;
  action: string;
  module: string;
  detail: string;
  ip: string;
}

const LOGS: AuditRow[] = [
  {
    id: '1',
    time: '14:38:12 UTC',
    actor: 'Alex R.',
    action: 'ACK_ALERT',
    module: 'Alerts',
    detail: 'Acknowledged ENG-441 on HT-14',
    ip: '10.12.4.21',
  },
  {
    id: '2',
    time: '14:30:05 UTC',
    actor: 'J. Brooks',
    action: 'DISPATCH_ASSIGN',
    module: 'Dispatch',
    detail: 'HT-11 → EX-01 Face C',
    ip: '10.12.4.44',
  },
  {
    id: '3',
    time: '14:12:40 UTC',
    actor: 'M. Torres',
    action: 'WO_UPDATE',
    module: 'Maintenance',
    detail: 'WO-2401 status → In Progress',
    ip: '10.12.5.8',
  },
  {
    id: '4',
    time: '13:55:18 UTC',
    actor: 'system',
    action: 'TELEMETRY_SYNC',
    module: 'System',
    detail: 'Fleet snapshot committed (12 assets)',
    ip: '—',
  },
  {
    id: '5',
    time: '13:40:02 UTC',
    actor: 'A. Liu',
    action: 'REPORT_VIEW',
    module: 'Reports',
    detail: 'Opened production analytics desk',
    ip: '10.12.1.90',
  },
  {
    id: '6',
    time: '12:15:33 UTC',
    actor: 'Alex R.',
    action: 'SETTINGS_UPDATE',
    module: 'Administration',
    detail: 'Shift code SHIFT-B confirmed',
    ip: '10.12.4.21',
  },
  {
    id: '7',
    time: '11:02:11 UTC',
    actor: 'S. Park',
    action: 'PART_ISSUE',
    module: 'Spare Parts',
    detail: 'SP-TPMS-12 issued to HT-04',
    ip: '10.12.5.12',
  },
  {
    id: '8',
    time: '09:45:00 UTC',
    actor: 'K. Okada',
    action: 'USER_INVITE',
    module: 'User Management',
    detail: 'Invite sent: yard.tech@mineops.local',
    ip: '10.12.0.5',
  },
];

export default function AuditLogsPage() {
  const columns: Column<AuditRow>[] = [
    { key: 'time', header: 'TIME', sortable: true, sortValue: (r) => r.time, render: (r) => r.time },
    { key: 'actor', header: 'ACTOR', sortable: true, sortValue: (r) => r.actor, render: (r) => r.actor },
    {
      key: 'action',
      header: 'ACTION',
      render: (r) => <span className="font-mono text-[11px] text-[#1ADBDE]">{r.action}</span>,
    },
    { key: 'module', header: 'MODULE', render: (r) => r.module },
    { key: 'detail', header: 'DETAIL', render: (r) => <span className="text-[#A8B0B7]">{r.detail}</span> },
    { key: 'ip', header: 'IP', render: (r) => <span className="font-mono text-[#6A737C]">{r.ip}</span> },
  ];

  return (
    <PageShell
      title="AUDIT LOGS"
      subtitle="Immutable operational & administrative event trail"
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="EVENTS (SHIFT)" value={LOGS.length} tone="cyan" />
        <StatTile label="DISPATCH" value={LOGS.filter((l) => l.module === 'Dispatch').length} />
        <StatTile
          label="MAINTENANCE"
          value={LOGS.filter((l) => l.module === 'Maintenance').length}
          tone="amber"
        />
        <StatTile
          label="ADMIN"
          value={
            LOGS.filter((l) => l.module.includes('Admin') || l.module === 'User Management').length
          }
        />
      </div>
      <DataTable
        rows={LOGS}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search actor, action, module…"
        searchFn={(r, q) =>
          r.actor.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          r.module.toLowerCase().includes(q) ||
          r.detail.toLowerCase().includes(q)
        }
      />
    </PageShell>
  );
}
