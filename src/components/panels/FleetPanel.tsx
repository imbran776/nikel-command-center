import { Flag, MapPin, Radio, Wrench } from 'lucide-react';
import { useOps } from '../../contexts/OpsContext';
import type { EquipmentRow } from '../../types/telemetry';
import { GhostBtn, PrimaryBtn } from '../ui/ModalShell';

interface FleetPanelProps {
  rows: EquipmentRow[];
  onLocate: (row: EquipmentRow) => void;
}

export default function FleetPanel({ rows, onLocate }: FleetPanelProps) {
  const { setActiveNav, openModal, flaggedUnits, toggleFlagUnit, pushToast } = useOps();

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-[#2A3036] bg-[#151A1F]">
      <div className="flex items-center justify-between border-b border-[#2A3036] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-[0.1em] text-[#E8ECEF]">
            FLEET CONTROL
          </h2>
          <p className="mt-0.5 text-[11px] text-[#7A848C]">
            {rows.length} assets · live telemetry feed
          </p>
        </div>
        <GhostBtn onClick={() => setActiveNav('dashboard')}>Back to dashboard</GhostBtn>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const flagged = flaggedUnits.has(row.unit);
            return (
              <div
                key={row.id}
                className={`rounded-lg border bg-[#12171C] p-3 ${
                  flagged ? 'border-[#F6A214]/70' : 'border-[#2A3036]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-[14px] font-semibold text-[#E8ECEF]">
                      {row.unit}
                    </div>
                    <div className="text-[11px] text-[#7A848C]">{row.type}</div>
                  </div>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      color:
                        row.status === 'Active'
                          ? '#3AC7A3'
                          : row.status === 'Maintenance'
                            ? '#F6A214'
                            : '#A8B0B7',
                      backgroundColor: '#1A2228',
                    }}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-[#8A949C]">
                  Driver: <span className="text-[#C8D0D6]">{row.driver}</span>
                </div>
                <div className="mt-1 text-[11px] text-[#8A949C]">
                  Health:{' '}
                  <span className="font-semibold text-[#1ADBDE]">{row.health}%</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <PrimaryBtn
                    tone="cyan"
                    onClick={() => {
                      onLocate(row);
                      setActiveNav('dashboard');
                      pushToast({
                        tone: 'info',
                        title: `Locating ${row.unit}`,
                        message: 'Map focused on last known GPS fix.',
                      });
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Locate
                    </span>
                  </PrimaryBtn>
                  <PrimaryBtn
                    tone="muted"
                    onClick={() => openModal({ type: 'radio', unit: row.unit, driver: row.driver })}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Radio className="h-3 w-3" /> Radio
                    </span>
                  </PrimaryBtn>
                  <PrimaryBtn
                    tone="muted"
                    onClick={() =>
                      openModal({ type: 'service', unit: row.unit, driver: row.driver })
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> Service
                    </span>
                  </PrimaryBtn>
                  <PrimaryBtn tone={flagged ? 'amber' : 'muted'} onClick={() => toggleFlagUnit(row.unit)}>
                    <span className="inline-flex items-center gap-1">
                      <Flag className="h-3 w-3" /> {flagged ? 'Flagged' : 'Flag'}
                    </span>
                  </PrimaryBtn>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
