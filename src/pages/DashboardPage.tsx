import DailyProduction from '../components/DailyProduction';
import EquipmentTable from '../components/EquipmentTable';
import GaugeCard from '../components/GaugeCard';
import LiveMap from '../components/LiveMap';
import { useEquipmentStatus } from '../hooks/useEquipmentStatus';
import { useLiveTelemetry } from '../hooks/useLiveTelemetry';
import { useProductionData } from '../hooks/useProductionData';
import { useVehiclePositions } from '../hooks/useVehiclePositions';
import type { EquipmentRow } from '../types/fms';

/**
 * Original operations dashboard layout (restored):
 * Left  — Live Map Panel + Equipment Status Table
 * Right — Telemetry KPI gauges (2×2) + Daily Production
 */
export default function DashboardPage() {
  const { kpis } = useLiveTelemetry();
  const { vehicles, selectedId, setSelectedId, focus, focusOn } = useVehiclePositions();
  const { rows, sortKey, sortDir, toggleSort } = useEquipmentStatus();
  const { bars, total, target, xLabels } = useProductionData();

  const locateEquipment = (row: EquipmentRow) => {
    const seed = row.unit.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const x = 40 + (seed % 30);
    const y = 30 + (seed % 40);
    focusOn(x, y, row.unit);
    setSelectedId(row.unit);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-2.5 overflow-hidden">
      {/* Left column: map + equipment table */}
      <section className="flex min-h-0 min-w-0 flex-col gap-2.5 overflow-hidden">
        <LiveMap
          vehicles={vehicles}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onFocusUnit={focusOn}
          focus={focus}
        />
        <div className="flex min-h-0 flex-[0.85] flex-col overflow-hidden">
          <EquipmentTable
            rows={rows}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onLocate={locateEquipment}
          />
        </div>
      </section>

      {/* Right column: telemetry gauges + daily production */}
      <section className="flex min-h-0 min-w-0 flex-col gap-2.5 overflow-hidden">
        <div className="shrink-0">
          <h2 className="mb-1.5 px-0.5 text-[11px] font-semibold tracking-[0.14em] text-[#C8D0D6]">
            TELEMETRY KPI CARDS
          </h2>
          {/*
            Grid order matches reference:
            [ FUEL USAGE amber ] [ OPERATING EFFICIENCY cyan ]
            [ FUEL USAGE cyan⚠ ] [ DOWNTIME amber⚠ ]
          */}
          <div className="grid grid-cols-2 gap-2">
            {kpis.map((kpi) => (
              <GaugeCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </div>
        <DailyProduction bars={bars} total={total} target={target} xLabels={xLabels} />
      </section>
    </div>
  );
}
