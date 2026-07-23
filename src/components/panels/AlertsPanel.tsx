import { AlertTriangle, CheckCheck, Info, Siren } from 'lucide-react';
import { useOps } from '../../contexts/OpsContext';
import type { AlertSeverity } from '../../data/alerts';
import { GhostBtn, PrimaryBtn } from '../ui/ModalShell';

const SEV: Record<
  AlertSeverity,
  { label: string; color: string; Icon: typeof Siren }
> = {
  critical: { label: 'CRITICAL', color: '#D6403E', Icon: Siren },
  warning: { label: 'WARNING', color: '#F6A214', Icon: AlertTriangle },
  info: { label: 'INFO', color: '#1ADBDE', Icon: Info },
};

export default function AlertsPanel() {
  const { alerts, acknowledgeAlert, acknowledgeAll, setActiveNav, alertCount } = useOps();

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-[#2A3036] bg-[#151A1F]">
      <div className="flex items-center justify-between border-b border-[#2A3036] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-[0.1em] text-[#E8ECEF]">
            OPERATIONS ALERTS
          </h2>
          <p className="mt-0.5 text-[11px] text-[#7A848C]">
            {alertCount} open · Pit North command queue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrimaryBtn tone="muted" onClick={acknowledgeAll}>
            <span className="inline-flex items-center gap-1.5">
              <CheckCheck className="h-3.5 w-3.5" /> Ack all
            </span>
          </PrimaryBtn>
          <GhostBtn onClick={() => setActiveNav('dashboard')}>Back to dashboard</GhostBtn>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="space-y-2">
          {alerts.map((a) => {
            const conf = SEV[a.severity];
            const Icon = conf.Icon;
            return (
              <li
                key={a.id}
                className={`rounded-lg border border-[#2A3036] bg-[#12171C] px-3 py-2.5 ${
                  a.acknowledged ? 'opacity-55' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${conf.color}22`, color: conf.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-[10px] font-bold tracking-wider"
                        style={{ color: conf.color }}
                      >
                        {conf.label}
                      </span>
                      <span className="font-mono text-[10px] text-[#6A737C]">{a.code}</span>
                      <span className="text-[10px] text-[#5A636C]">{a.time}</span>
                      {a.unit && (
                        <span className="rounded bg-[#1A2428] px-1.5 py-0.5 font-mono text-[10px] text-[#1ADBDE]">
                          {a.unit}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-[#C8D0D6]">{a.title}</p>
                  </div>
                  {!a.acknowledged ? (
                    <PrimaryBtn tone="cyan" onClick={() => acknowledgeAlert(a.id)}>
                      Acknowledge
                    </PrimaryBtn>
                  ) : (
                    <span className="text-[10px] font-medium tracking-wide text-[#3AC7A3]">
                      ACK
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
