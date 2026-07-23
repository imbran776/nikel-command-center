import { CalendarClock, CheckCircle2, Clock3 } from 'lucide-react';
import { useState } from 'react';
import { useOps } from '../../contexts/OpsContext';
import type { EquipmentRow } from '../../types/telemetry';
import { GhostBtn, PrimaryBtn } from '../ui/ModalShell';

interface MaintenancePanelProps {
  rows: EquipmentRow[];
}

export default function MaintenancePanel({ rows }: MaintenancePanelProps) {
  const { setActiveNav, pushToast } = useOps();
  const [queue, setQueue] = useState(() =>
    rows
      .filter((r) => r.status === 'Maintenance' || r.health < 80)
      .map((r, i) => ({
        id: r.id,
        unit: r.unit,
        type: r.type,
        health: r.health,
        bay: `BAY-${(i % 3) + 1}`,
        eta: `${2 + i}h`,
        status: r.status === 'Maintenance' ? 'In progress' : 'Queued',
      })),
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-[#2A3036] bg-[#151A1F]">
      <div className="flex items-center justify-between border-b border-[#2A3036] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-[0.1em] text-[#E8ECEF]">
            MAINTENANCE QUEUE
          </h2>
          <p className="mt-0.5 text-[11px] text-[#7A848C]">Workshop · Pit North yard</p>
        </div>
        <GhostBtn onClick={() => setActiveNav('dashboard')}>Back to dashboard</GhostBtn>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="space-y-2">
          {queue.map((job) => (
            <li
              key={job.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-[#2A3036] bg-[#12171C] px-3 py-2.5"
            >
              <div className="min-w-[90px]">
                <div className="font-mono text-[13px] font-semibold text-[#E8ECEF]">{job.unit}</div>
                <div className="text-[10px] text-[#6A737C]">{job.type}</div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8A949C]">
                <CalendarClock className="h-3.5 w-3.5 text-[#F6A214]" />
                {job.bay}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8A949C]">
                <Clock3 className="h-3.5 w-3.5" /> ETA {job.eta}
              </div>
              <div className="text-[11px] text-[#A8B0B7]">Health {job.health}%</div>
              <span className="rounded bg-[#1A2428] px-2 py-0.5 text-[10px] font-semibold text-[#F6A214]">
                {job.status}
              </span>
              <div className="ml-auto flex gap-1.5">
                <PrimaryBtn
                  tone="cyan"
                  onClick={() => {
                    setQueue((q) =>
                      q.map((j) =>
                        j.id === job.id ? { ...j, status: 'Released' } : j,
                      ),
                    );
                    pushToast({
                      tone: 'success',
                      title: `${job.unit} released`,
                      message: 'Asset returned to available pool.',
                    });
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Release
                  </span>
                </PrimaryBtn>
                <PrimaryBtn
                  tone="muted"
                  onClick={() =>
                    pushToast({
                      tone: 'info',
                      title: 'Work order opened',
                      message: `WO-${job.unit}-SHIFTB created for workshop.`,
                    })
                  }
                >
                  Open WO
                </PrimaryBtn>
              </div>
            </li>
          ))}
          {!queue.length && (
            <div className="rounded-lg border border-dashed border-[#2A3036] px-4 py-8 text-center text-[12px] text-[#6A737C]">
              No units currently queued for maintenance.
            </div>
          )}
        </ul>
      </div>
    </div>
  );
}
