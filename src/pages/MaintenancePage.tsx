import { Plus } from 'lucide-react';
import { useState } from 'react';
import Button from '../components/ui/Button';
import DataTable, { type Column } from '../components/ui/DataTable';
import PageShell, { StatTile } from '../components/ui/PageShell';
import StatusBadge from '../components/ui/StatusBadge';
import { useOps } from '../contexts/OpsContext';
import { WORK_ORDERS } from '../data/enterprise';
import type { WorkOrder } from '../types/fms';

export default function MaintenancePage() {
  const { openModal, pushToast } = useOps();
  const [orders, setOrders] = useState(WORK_ORDERS);
  const [tab, setTab] = useState<'all' | 'Preventive' | 'Corrective'>('all');
  const rows = tab === 'all' ? orders : orders.filter((o) => o.type === tab);

  const columns: Column<WorkOrder>[] = [
    { key: 'id', header: 'WO', sortable: true, sortValue: (r) => r.id, render: (r) => <span className="font-mono text-[#1ADBDE]">{r.id}</span> },
    { key: 'unit', header: 'UNIT', sortable: true, sortValue: (r) => r.unit, render: (r) => r.unit },
    { key: 'type', header: 'TYPE', render: (r) => r.type },
    { key: 'title', header: 'TITLE', render: (r) => <span className="line-clamp-1 max-w-[220px]">{r.title}</span> },
    { key: 'st', header: 'STATUS', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'pri', header: 'PRIORITY', render: (r) => <StatusBadge value={r.priority} /> },
    { key: 'tech', header: 'TECHNICIAN', render: (r) => r.technician },
    { key: 'parts', header: 'PARTS', render: (r) => <span className="text-[#8A949C]">{r.parts}</span> },
    { key: 'cost', header: 'COST', sortable: true, sortValue: (r) => r.costUsd, render: (r) => `$${r.costUsd.toLocaleString()}` },
    {
      key: 'hrs',
      header: 'HRS LEFT',
      sortable: true,
      sortValue: (r) => r.hoursRemaining,
      render: (r) => (
        <span style={{ color: r.hoursRemaining < 30 ? '#D6403E' : r.hoursRemaining < 80 ? '#F6A214' : '#3AC7A3' }}>
          {r.hoursRemaining}
          {r.hoursRemaining < 30 ? ' · DUE' : ''}
        </span>
      ),
    },
    { key: 'due', header: 'DUE', render: (r) => r.dueDate },
    {
      key: 'act',
      header: '',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {r.status !== 'Completed' && (
            <Button
              size="sm"
              variant="success"
              onClick={() => {
                setOrders((prev) => prev.map((o) => (o.id === r.id ? { ...o, status: 'Completed' } : o)));
                pushToast({ tone: 'success', title: `${r.id} completed` });
              }}
            >
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="MAINTENANCE"
      subtitle="Preventive & corrective · work orders · service due"
      actions={
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => openModal({ type: 'service', unit: 'HT-04', driver: 'L. Wang' })}
        >
          New work order
        </Button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="OPEN" value={orders.filter((o) => o.status === 'Open').length} tone="cyan" />
        <StatTile label="IN PROGRESS" value={orders.filter((o) => o.status === 'In Progress').length} tone="amber" />
        <StatTile label="PARTS HOLD" value={orders.filter((o) => o.status === 'Parts Hold').length} />
        <StatTile label="COST OPEN" value={`$${orders.filter((o) => o.status !== 'Completed').reduce((s, o) => s + o.costUsd, 0).toLocaleString()}`} tone="amber" />
      </div>
      <div className="mb-3 flex gap-1.5">
        {(['all', 'Preventive', 'Corrective'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              tab === t ? 'bg-[#F6A214] text-[#0D1116]' : 'bg-[#1A2026] text-[#8A949C]'
            }`}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search WO, unit, tech…"
        searchFn={(r, q) =>
          r.id.toLowerCase().includes(q) ||
          r.unit.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.technician.toLowerCase().includes(q)
        }
        emptyTitle="No work orders"
      />
    </PageShell>
  );
}
