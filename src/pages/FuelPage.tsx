import DataTable, { type Column } from '../components/ui/DataTable';
import PageShell, { StatTile } from '../components/ui/PageShell';
import { useOps } from '../contexts/OpsContext';
import { FUEL_EVENTS } from '../data/enterprise';
import type { FuelEvent } from '../types/fms';

export default function FuelPage() {
  const { fleet } = useOps();
  const totalL = FUEL_EVENTS.reduce((s, f) => s + f.liters, 0);
  const totalCost = FUEL_EVENTS.reduce((s, f) => s + f.costUsd, 0);
  const lowFuel = fleet.filter((f) => f.fuelPct < 35);

  const columns: Column<FuelEvent>[] = [
    { key: 'at', header: 'TIME', render: (r) => r.at },
    {
      key: 'unit',
      header: 'UNIT',
      sortable: true,
      sortValue: (r) => r.unit,
      render: (r) => <span className="font-mono">{r.unit}</span>,
    },
    {
      key: 'l',
      header: 'LITERS',
      sortable: true,
      sortValue: (r) => r.liters,
      render: (r) => r.liters.toLocaleString(),
    },
    {
      key: 'c',
      header: 'COST',
      sortable: true,
      sortValue: (r) => r.costUsd,
      render: (r) => `$${r.costUsd}`,
    },
    { key: 'st', header: 'STATION', render: (r) => r.station },
    { key: 'op', header: 'OPERATOR', render: (r) => r.operator },
  ];

  const maxBurn = 100;

  return (
    <PageShell
      title="FUEL MANAGEMENT"
      subtitle="Consumption · efficiency · remaining · refuel history · cost"
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="REFUELED TODAY" value={`${totalL.toLocaleString()} L`} tone="cyan" />
        <StatTile label="FUEL COST" value={`$${totalCost.toLocaleString()}`} tone="amber" />
        <StatTile label="SITE BURN" value="18,240 L/h" tone="amber" hint="Live KPI" />
        <StatTile label="LOW FUEL ALERTS" value={lowFuel.length} tone="red" />
      </div>

      <div className="mb-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-[#2A3036] bg-[#12171C] p-3">
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-[#8A949C]">
            REMAINING FUEL BY UNIT
          </h3>
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {fleet.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-12 font-mono text-[#C8D0D6]">{f.unit}</span>
                <div className="h-1.5 flex-1 rounded-full bg-[#2A323A]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(f.fuelPct / maxBurn) * 100}%`,
                      backgroundColor:
                        f.fuelPct < 30 ? '#D6403E' : f.fuelPct < 50 ? '#F6A214' : '#1ADBDE',
                    }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums text-[#8A949C]">{f.fuelPct}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-[#2A3036] bg-[#12171C] p-3">
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-[#8A949C]">
            EFFICIENCY TREND (SHIFT)
          </h3>
          <div className="flex h-40 items-end gap-1.5">
            {[72, 75, 78, 74, 80, 83, 79, 84, 86, 82, 85, 88].map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-[#F6A214]/90"
                style={{ height: `${v}%` }}
                title={`${v} L/100t`}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[#5A636C]">
            Litres per 100 t moved — lower is better
          </p>
        </div>
      </div>

      <h3 className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-[#8A949C]">
        REFUELING HISTORY
      </h3>
      <DataTable
        rows={FUEL_EVENTS}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search unit or station…"
        searchFn={(r, q) =>
          r.unit.toLowerCase().includes(q) || r.station.toLowerCase().includes(q)
        }
      />
    </PageShell>
  );
}
