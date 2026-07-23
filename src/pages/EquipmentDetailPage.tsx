import {
  ArrowLeft,
  Droplets,
  Gauge,
  MapPin,
  Thermometer,
  Wrench,
} from 'lucide-react';
import Button from '../components/ui/Button';
import PageShell, { StatTile } from '../components/ui/PageShell';
import StatusBadge from '../components/ui/StatusBadge';
import { useOps } from '../contexts/OpsContext';

export default function EquipmentDetailPage() {
  const { fleet, selectedAssetId, setActiveNav, openModal, pushToast } = useOps();
  const asset = fleet.find((f) => f.id === selectedAssetId) ?? fleet[0];

  if (!asset) {
    return (
      <PageShell title="EQUIPMENT DETAIL" subtitle="No asset selected">
        <div className="py-16 text-center text-[13px] text-[#6A737C]">
          Select an asset from Fleet or Equipment.
          <div className="mt-3">
            <Button onClick={() => setActiveNav('equipment')}>Back to equipment</Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const sensors = [
    { label: 'Coolant temp', value: '89 °C', ok: true, icon: Thermometer },
    { label: 'Oil pressure', value: ' equ 48 psi', ok: true, icon: Gauge },
    { label: 'Hydraulic', value: '210 bar', ok: true, icon: Gauge },
    { label: 'Tire pressure', value: 'FL 102 / FR 98', ok: asset.unit !== 'HT-04', icon: Gauge },
    { label: 'Fuel rate', value: '86 L/h', ok: asset.fuelPct > 30, icon: Droplets },
    { label: 'GPS / radio', value: asset.connectivity, ok: asset.connectivity === 'Online', icon: MapPin },
  ];

  const errors =
    asset.status === 'Breakdown'
      ? [{ code: 'E-441', msg: 'Engine derate — high exhaust temp' }, { code: 'C-112', msg: 'Transmission slip detected' }]
      : asset.health < 50
        ? [{ code: 'M-220', msg: 'Service overdue — cooler circuit' }]
        : [];

  return (
    <PageShell
      title={`EQUIPMENT · ${asset.unit}`}
      subtitle={`${asset.type} · ${asset.location} · last update ${asset.lastUpdate}`}
      actions={
        <>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => setActiveNav('equipment')}>
            Back
          </Button>
          <Button
            variant="warning"
            size="sm"
            leftIcon={<Wrench className="h-3.5 w-3.5" />}
            onClick={() => openModal({ type: 'service', unit: asset.unit, driver: asset.operator })}
          >
            Work order
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openModal({ type: 'assign', unit: asset.unit })}
          >
            Assign
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge value={asset.status} size="md" />
        <StatusBadge value={asset.engine} />
        <StatusBadge value={asset.connectivity} />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <StatTile label="HEALTH" value={`${asset.health}%`} tone={asset.health >= 80 ? 'cyan' : 'amber'} />
        <StatTile label="ENGINE HRS" value={asset.engineHours.toLocaleString()} />
        <StatTile label="FUEL" value={`${asset.fuelPct}%`} tone={asset.fuelPct < 30 ? 'red' : 'amber'} />
        <StatTile label="UTILIZATION" value={`${asset.utilization}%`} tone="cyan" />
        <StatTile label="AVAILABILITY" value={`${asset.availability}%`} tone="green" />
        <StatTile label="PAYLOAD" value={`${asset.payloadT} t`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-lg border border-[#2A3036] bg-[#12171C] p-3">
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-[#8A949C]">GENERAL</h3>
          <dl className="grid grid-cols-2 gap-2 text-[12px]">
            <Item label="Operator" value={asset.operator} />
            <Item label="Assignment" value={asset.assignment} />
            <Item label="Location" value={asset.location} />
            <Item label="Destination" value={asset.destination} />
            <Item label="Speed" value={`${asset.speedKph} kph`} />
            <Item label="Trips today" value={String(asset.tripsToday)} />
            <Item label="Cycle time" value={asset.cycleMin ? `${asset.cycleMin} min` : '—'} />
            <Item label="Map ref" value={`${asset.mapX}, ${asset.mapY} (static)`} />
          </dl>
        </section>

        <section className="rounded-lg border border-[#2A3036] bg-[#12171C] p-3">
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-[#8A949C]">SENSORS</h3>
          <ul className="space-y-2">
            {sensors.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.label} className="flex items-center justify-between rounded-md bg-[#0D1116] px-2.5 py-2">
                  <span className="inline-flex items-center gap-2 text-[12px] text-[#A8B0B7]">
                    <Icon className="h-3.5 w-3.5 text-[#5A636C]" />
                    {s.label}
                  </span>
                  <span className="text-[12px] font-medium" style={{ color: s.ok ? '#3AC7A3' : '#F6A214' }}>
                    {s.value}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-lg border border-[#2A3036] bg-[#12171C] p-3">
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-[#8A949C]">ERROR CODES</h3>
          {errors.length ? (
            <ul className="space-y-2">
              {errors.map((e) => (
                <li key={e.code} className="rounded-md border border-[#D6403E]/30 bg-[#1A1212] px-2.5 py-2">
                  <div className="font-mono text-[12px] font-semibold text-[#D6403E]">{e.code}</div>
                  <div className="text-[11px] text-[#A8B0B7]">{e.msg}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[12px] text-[#5A636C]">No active fault codes</p>
          )}
        </section>

        <section className="rounded-lg border border-[#2A3036] bg-[#12171C] p-3">
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-[#8A949C]">
            MAINTENANCE & LOCATION HISTORY
          </h3>
          <ul className="space-y-2 text-[12px] text-[#A8B0B7]">
            <li className="flex justify-between border-b border-[#1E242A] pb-2">
              <span>Last service</span>
              <span className="text-[#C8D0D6]">2025-09-14 · 250hr</span>
            </li>
            <li className="flex justify-between border-b border-[#1E242A] pb-2">
              <span>Next due</span>
              <span className="text-[#F6A214]">{Math.max(20, 500 - (asset.engineHours % 500))} hrs remaining</span>
            </li>
            <li className="flex justify-between border-b border-[#1E242A] pb-2">
              <span>Trail (static)</span>
              <span className="text-[#C8D0D6]">Face → HR-N → Crusher</span>
            </li>
            <li className="flex justify-between">
              <span>Performance index</span>
              <span className="text-[#1ADBDE]">{Math.round((asset.utilization + asset.availability) / 2)}</span>
            </li>
          </ul>
          </section>
      </div>
    </PageShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-[#5A636C]">{label}</dt>
      <dd className="mt-0.5 text-[#E8ECEF]">{value}</dd>
    </div>
  );
}
