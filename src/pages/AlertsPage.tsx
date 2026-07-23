import { AlertTriangle, CheckCheck, Info, Siren } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import PageShell, { StatTile } from '../components/ui/PageShell';
import { useOps } from '../contexts/OpsContext';
import type { AlertSeverity } from '../types/fms';

const SEV: Record<AlertSeverity, { label: string; color: string; Icon: typeof Siren }> = {
  critical: { label: 'CRITICAL', color: '#D6403E', Icon: Siren },
  warning: { label: 'WARNING', color: '#F6A214', Icon: AlertTriangle },
  info: { label: 'INFO', color: '#1ADBDE', Icon: Info },
};

export default function AlertsPage() {
  const { alerts, acknowledgeAlert, acknowledgeAll, alertCount, openAssetDetail, fleet } = useOps();
  const [filter, setFilter] = useState<'all' | AlertSeverity | 'open'>('open');

  const rows = useMemo(() => {
    if (filter === 'open') return alerts.filter((a) => !a.acknowledged);
    if (filter === 'all') return alerts;
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  return (
    <PageShell
      title="ALERTS CENTER"
      subtitle="Critical · warning · info · acknowledgement · history"
      actions={
        <Button variant="secondary" size="sm" leftIcon={<CheckCheck className="h-3.5 w-3.5" />} onClick={acknowledgeAll}>
          Ack all
        </Button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="OPEN" value={alertCount} tone="red" />
        <StatTile label="CRITICAL" value={alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length} tone="red" />
        <StatTile label="WARNING" value={alerts.filter((a) => a.severity === 'warning' && !a.acknowledged).length} tone="amber" />
        <StatTile label="INFO" value={alerts.filter((a) => a.severity === 'info').length} tone="cyan" />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['open', 'all', 'critical', 'warning', 'info'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
              filter === f ? 'bg-[#D6403E] text-white' : 'bg-[#1A2026] text-[#8A949C]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {rows.map((a) => {
          const conf = SEV[a.severity];
          const Icon = conf.Icon;
          return (
            <li
              key={a.id}
              className={`rounded-lg border border-[#2A3036] bg-[#12171C] px-3 py-2.5 ${a.acknowledged ? 'opacity-55' : ''}`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${conf.color}22`, color: conf.color }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider" style={{ color: conf.color }}>
                      {conf.label}
                    </span>
                    <span className="font-mono text-[10px] text-[#6A737C]">{a.code}</span>
                    <span className="rounded bg-[#1A2428] px-1.5 py-0.5 text-[9px] text-[#8A949C]">{a.category}</span>
                    <span className="text-[10px] text-[#5A636C]">{a.time}</span>
                    {a.unit && (
                      <button
                        type="button"
                        className="rounded bg-[#1A2428] px-1.5 py-0.5 font-mono text-[10px] text-[#1ADBDE] hover:underline"
                        onClick={() => {
                          const asset = fleet.find((f) => f.unit === a.unit);
                          if (asset) openAssetDetail(asset.id);
                        }}
                      >
                        {a.unit}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-[#C8D0D6]">{a.title}</p>
                </div>
                {!a.acknowledged ? (
                  <Button variant="primary" size="sm" onClick={() => acknowledgeAlert(a.id)}>
                    Acknowledge
                  </Button>
                ) : (
                  <span className="text-[10px] font-semibold text-[#3AC7A3]">ACK</span>
                )}
              </div>
            </li>
          );
        })}
        {!rows.length && (
          <li className="rounded-lg border border-dashed border-[#2A3036] py-12 text-center text-[12px] text-[#5A636C]">
            No alerts in this view
          </li>
        )}
      </ul>
    </PageShell>
  );
}
