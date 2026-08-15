import {
  Eye,
  Fuel,
  History,
  MapPin,
  MoreHorizontal,
  Pencil,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import DataTable, { type Column } from '../components/ui/DataTable';
import DropdownMenu from '../components/ui/DropdownMenu';
import PageShell from '../components/ui/PageShell';
import StatusBadge from '../components/ui/StatusBadge';
import { useOps } from '../contexts/OpsContext';
import type { AssetStatus, FleetAsset } from '../types/fms';

const STATUS_FILTERS: Array<'all' | AssetStatus> = [
  'all',
  'Active',
  'Loading',
  'Hauling',
  'Dumping',
  'Waiting',
  'Idle',
  'Maintenance',
  'Breakdown',
  'Offline',
];

export default function FleetPage() {
  const {
    fleet,
    openModal,
    pushToast,
    openAssetDetail,
    flaggedUnits,
    toggleFlagUnit,
    setActiveNav,
  } = useOps();
  const [status, setStatus] = useState<'all' | AssetStatus>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(
    () => (status === 'all' ? fleet : fleet.filter((f) => f.status === status)),
    [fleet, status],
  );

  const columns: Column<FleetAsset>[] = [
    {
      key: 'unit',
      header: 'EQUIPMENT ID',
      sortable: true,
      sortValue: (r) => r.unit,
      render: (r) => (
        <span className="font-mono font-semibold text-[#E8ECEF]">
          {r.unit}
          {flaggedUnits.has(r.unit) && <span className="ml-1 text-[#F6A214]">★</span>}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'TYPE',
      sortable: true,
      sortValue: (r) => r.type,
      render: (r) => <span className="text-[#8A949C]">{r.type}</span>,
    },
    {
      key: 'status',
      header: 'STATUS',
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: 'engine',
      header: 'ENGINE',
      render: (r) => <StatusBadge value={r.engine} />,
    },
    {
      key: 'conn',
      header: 'CONNECTIVITY',
      render: (r) => <StatusBadge value={r.connectivity} />,
    },
    {
      key: 'op',
      header: 'OPERATOR',
      sortable: true,
      sortValue: (r) => r.operator,
      render: (r) => r.operator,
    },
    {
      key: 'fuel',
      header: 'FUEL',
      sortable: true,
      sortValue: (r) => r.fuelPct,
      render: (r) => (
        <span style={{ color: r.fuelPct < 30 ? '#D6403E' : r.fuelPct < 50 ? '#F6A214' : '#1ADBDE' }}>
          {r.fuelPct}%
        </span>
      ),
    },
    {
      key: 'health',
      header: 'HEALTH',
      sortable: true,
      sortValue: (r) => r.health,
      render: (r) => (
        <div className="flex min-w-[90px] items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-[#2A323A]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${r.health}%`,
                backgroundColor: r.health >= 80 ? '#1ADBDE' : '#F6A214',
              }}
            />
          </div>
          <span className="w-8 text-right tabular-nums">{r.health}%</span>
        </div>
      ),
    },
    {
      key: 'hours',
      header: 'ENGINE HRS',
      sortable: true,
      sortValue: (r) => r.engineHours,
      render: (r) => r.engineHours.toLocaleString(),
    },
    {
      key: 'assign',
      header: 'ASSIGNMENT',
      render: (r) => <span className="line-clamp-1 max-w-[140px] text-[#A8B0B7]">{r.assignment}</span>,
    },
    {
      key: 'loc',
      header: 'LOCATION',
      render: (r) => r.location,
    },
    {
      key: 'spd',
      header: 'SPEED',
      sortable: true,
      sortValue: (r) => r.speedKph,
      render: (r) => `${r.speedKph} kph`,
    },
    {
      key: 'dest',
      header: 'DESTINATION',
      render: (r) => r.destination,
    },
    {
      key: 'payload',
      header: 'PAYLOAD',
      sortable: true,
      sortValue: (r) => r.payloadT,
      render: (r) => `${r.payloadT} t`,
    },
    {
      key: 'upd',
      header: 'LAST UPDATE',
      render: (r) => <span className="text-[#6A737C]">{r.lastUpdate}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-12',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            trigger={
              <button type="button" className="rounded p-1 text-[#5A636C] hover:bg-[#252B31] hover:text-[#A8B0B7]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
            items={[
              { id: 'v', label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onSelect: () => openAssetDetail(r.id) },
              {
                id: 't',
                label: 'Track on map',
                icon: <MapPin className="h-3.5 w-3.5" />,
                onSelect: () => {
                  setActiveNav('live-ops');
                  pushToast({ tone: 'info', title: `Tracking ${r.unit}`, message: `${r.location} · open Live Operations` });
                },
              },
              {
                id: 'a',
                label: 'Assign / reassign',
                icon: <UserPlus className="h-3.5 w-3.5" />,
                onSelect: () => openModal({ type: 'assign', unit: r.unit }),
              },
              {
                id: 'm',
                label: 'Maintenance',
                icon: <Wrench className="h-3.5 w-3.5" />,
                onSelect: () => openModal({ type: 'service', unit: r.unit, driver: r.operator }),
              },
              {
                id: 'f',
                label: 'Fuel log',
                icon: <Fuel className="h-3.5 w-3.5" />,
                onSelect: () => {
                  setActiveNav('fuel');
                  pushToast({ tone: 'info', title: r.unit, message: `Fuel ${r.fuelPct}% remaining` });
                },
              },
              {
                id: 'h',
                label: 'History',
                icon: <History className="h-3.5 w-3.5" />,
                onSelect: () =>
                  pushToast({ tone: 'info', title: 'History', message: `${r.unit} trip & cycle telemetry history.` }),
              },
              {
                id: 'e',
                label: 'Edit record',
                icon: <Pencil className="h-3.5 w-3.5" />,
                onSelect: () => pushToast({ tone: 'info', title: 'Edit', message: `Editing configuration for ${r.unit}.` }),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="FLEET DIRECTORY"
      subtitle={`${fleet.length} assets · Pit North command`}
      actions={
        <Button variant="primary" size="sm" leftIcon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => openModal({ type: 'assign' })}>
          Assign
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
              status === s
                ? 'bg-[#1ADBDE] text-[#0D1116]'
                : 'bg-[#1A2026] text-[#8A949C] hover:text-[#C8D0D6]'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-[#2A3036] bg-[#12171C] px-3 py-2 text-[11px]">
          <span className="text-[#C8D0D6]">{selected.size} selected</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              selected.forEach((id) => {
                const a = fleet.find((f) => f.id === id);
                if (a) toggleFlagUnit(a.unit);
              });
            }}
          >
            Flag selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search unit, operator, location…"
        searchFn={(r, q) =>
          r.unit.toLowerCase().includes(q) ||
          r.operator.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)
        }
        onRowClick={(r) => openAssetDetail(r.id)}
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
        emptyTitle="No fleet assets match"
      />
    </PageShell>
  );
}
