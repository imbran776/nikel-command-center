import { useMemo } from 'react';
import DailyProduction from '../components/DailyProduction';
import EquipmentTable from '../components/EquipmentTable';
import GaugeCard from '../components/GaugeCard';
import LiveMap from '../components/LiveMap';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { useEquipmentStatus } from '../hooks/useEquipmentStatus';
import { useLiveTelemetry } from '../hooks/useLiveTelemetry';
import { useProductionData } from '../hooks/useProductionData';
import { useVehiclePositions } from '../hooks/useVehiclePositions';
import { useOps } from '../contexts/OpsContext';
import { latLngToMapXY } from '../lib/mapConfig';
import type { EquipmentRow, VehicleMarker } from '../types/fms';

/**
 * Original operations dashboard layout (restored):
 * Left  — Live Map Panel + Equipment Status Table
 * Right — Telemetry KPI gauges (2×2) + Daily Production
 */
export default function DashboardPage() {
  const { kpis } = useLiveTelemetry();
  const {
    vehicles,
    selectedId,
    setSelectedId,
    focus,
    focusOn,
    addVehicle,
    mobileGpsActive,
    mobileGpsError,
    toggleMobileGpsTrack,
  } = useVehiclePositions();
  const { rows, sortKey, sortDir, toggleSort } = useEquipmentStatus();
  const { bars, total, target, xLabels } = useProductionData();
  const { fleet, gpsDevices } = useOps();

  const locateEquipment = (row: EquipmentRow) => {
    const asset = fleet.find((f) => f.unit === row.unit || f.id === row.id);
    if (asset) {
      focusOn(asset.mapX ?? 50, asset.mapY ?? 50, asset.unit, asset.lat, asset.lng);
      setSelectedId(asset.unit);
      return;
    }
    const dev = gpsDevices.find((d) => d.assetUnit === row.unit || d.name === row.unit || d.id === row.id);
    if (dev && dev.lat && dev.lng) {
      const xy = latLngToMapXY(dev.lat, dev.lng);
      focusOn(xy.x, xy.y, dev.id, dev.lat, dev.lng);
      setSelectedId(dev.id);
      return;
    }
    const v = vehicles.find((x) => x.label === row.unit || x.id === row.id);
    if (v) {
      focusOn(v.x, v.y, v.id, v.lat, v.lng);
      setSelectedId(v.id);
      return;
    }
    focusOn(50, 50, row.unit);
    setSelectedId(row.unit);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-2.5 overflow-hidden">
      {/* Left column: map + equipment table */}
      <section className="flex min-h-0 min-w-0 flex-col gap-2.5 overflow-hidden">
        <MapErrorBoundary>
          <LiveMap
            vehicles={vehicles}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onFocusUnit={focusOn}
            focus={focus}
            onAddVehicle={addVehicle}
            mobileGpsActive={mobileGpsActive}
            mobileGpsError={mobileGpsError}
            onToggleMobileGps={toggleMobileGpsTrack}
          />
        </MapErrorBoundary>
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

