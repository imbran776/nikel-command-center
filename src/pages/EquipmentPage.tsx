import { useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import DataTable, { type Column } from '../components/ui/DataTable';
import PageShell from '../components/ui/PageShell';
import StatusBadge from '../components/ui/StatusBadge';
import { useOps } from '../contexts/OpsContext';
import type { FleetAsset } from '../types/fms';

export default function EquipmentPage() {
  const { fleet, openAssetDetail, setActiveNav } = useOps();
  const [type, setType] = useState('all');
  const types = useMemo(() => ['all', ...Array.from(new Set(fleet.map((f) => f.type)))], [fleet]);
  const rows = type === 'all' ? fleet : fleet.filter((f) => f.type === type);

  const columns: Column<FleetAsset>[] = [
    { key: 'unit', header: 'UNIT', sortable: true, sortValue: (r) => r.unit, render: (r) => <span className="font-mono font-semibold text-[#E8ECEF]">{r.unit}</span> },
    { key: 'type', header: 'TYPE', sortable: true, sortValue: (r) => r.type, render: (r) => r.type },
    { key: 'st', header: 'STATUS', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'health', header: 'HEALTH', sortable: true, sortValue: (r) => r.health, render: (r) => `${r.health}%` },
    { key: 'hrs', header: 'ENGINE HOURS', sortable: true, sortValue: (r) => r.engineHours, render: (r) => r.engineHours.toLocaleString() },
    { key: 'fuel', header: 'FUEL', sortable: true, sortValue: (r) => r.fuelPct, render: (r) => `${r.fuelPct}%` },
    { key: 'util', header: 'UTIL %', sortable: true, sortValue: (r) => r.utilization, render: (r) => `${r.utilization}%` },
    { key: 'avail', header: 'AVAIL %', sortable: true, sortValue: (r) => r.availability, render: (r) => `${r.availability}%` },
    { key: 'asg', header: 'ASSIGNMENT', render: (r) => <span className="text-[#8A949C]">{r.assignment}</span> },
    {
      key: 'act',
      header: '',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openAssetDetail(r.id); }}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <PageShell
      title="EQUIPMENT"
      subtitle="Master list · health · utilization · open detail for sensors & history"
      actions={
        <Button variant="secondary" size="sm" onClick={() => setActiveNav('maintenance')}>
          Maintenance queue
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              type === t ? 'bg-[#1ADBDE] text-[#0D1116]' : 'bg-[#1A2026] text-[#8A949C]'
            }`}
          >
            {t === 'all' ? 'All types' : t}
          </button>
        ))}
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search equipment…"
        searchFn={(r, q) => r.unit.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)}
        onRowClick={(r) => openAssetDetail(r.id)}
      />
    </PageShell>
  );
}
