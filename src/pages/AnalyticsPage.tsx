import type { ReactNode } from 'react';
import PageShell, { StatTile } from '../components/ui/PageShell';
import { useOps } from '../contexts/OpsContext';
import { DAILY_PRODUCTION, FLEET, OPERATORS } from '../data/enterprise';

export default function AnalyticsPage() {
  const { fleet } = useOps();
  const ranked = [...fleet].sort((a, b) => b.utilization - a.utilization).slice(0, 6);
  const opsRank = [...OPERATORS].sort((a, b) => b.performance - a.performance).slice(0, 5);
  const maxU = Math.max(...ranked.map((r) => r.utilization), 1);
  const maxP = Math.max(...DAILY_PRODUCTION.map((d) => d.actual), 1);

  const mtbf = 86;
  const mttr = 3.4;
  const maintCost = 6840;

  return (
    <PageShell title="ANALYTICS" subtitle="Trends · ranking · MTBF / MTTR · cost drivers">
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="MTBF" value={`${mtbf} h`} tone="green" hint="Mean time between failures" />
        <StatTile label="MTTR" value={`${mttr} h`} tone="amber" hint="Mean time to repair" />
        <StatTile label="MAINT COST (SHIFT)" value={`$${maintCost.toLocaleString()}`} tone="amber" />
        <StatTile label="AVG CYCLE" value="18.6 min" tone="cyan" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="PRODUCTION TREND (7D)">
          <div className="flex h-36 items-end gap-2">
            {DAILY_PRODUCTION.filter((d) => d.target > 0).map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-[28px] rounded-t bg-[#1ADBDE]"
                  style={{ height: `${(d.actual / maxP) * 100}%` }}
                />
                <span className="text-[9px] text-[#5A636C]">{d.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="FUEL TREND (SHIFT HOURS)">
          <div className="flex h-36 items-end gap-1">
            {[62, 65, 70, 68, 74, 78, 76, 80, 84, 82, 79, 85].map((v, i) => (
              <div key={i} className="flex-1 rounded-t bg-[#F6A214]/85" style={{ height: `${v}%` }} />
            ))}
          </div>
        </Panel>

        <Panel title="EQUIPMENT UTILIZATION RANKING">
          <ul className="space-y-2">
            {ranked.map((r, i) => (
              <li key={r.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-4 text-[#5A636C]">{i + 1}</span>
                <span className="w-12 font-mono text-[#E8ECEF]">{r.unit}</span>
                <div className="h-1.5 flex-1 rounded-full bg-[#2A323A]">
                  <div
                    className="h-full rounded-full bg-[#3AC7A3]"
                    style={{ width: `${(r.utilization / maxU) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums text-[#A8B0B7]">{r.utilization}%</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="OPERATOR PERFORMANCE">
          <ul className="space-y-2">
            {opsRank.map((o, i) => (
              <li key={o.id} className="flex items-center justify-between text-[11px]">
                <span className="text-[#5A636C]">{i + 1}. {o.name}</span>
                <span className="text-[#C8D0D6]">
                  {o.assignedUnit} · perf {o.performance} · safety {o.safetyScore}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="MAINTENANCE COST DRIVERS">
          <ul className="space-y-2 text-[12px] text-[#A8B0B7]">
            <li className="flex justify-between"><span>Corrective — powertrain</span><span className="text-[#F6A214]">$4,200</span></li>
            <li className="flex justify-between"><span>Preventive — pins & wear</span><span>$980</span></li>
            <li className="flex justify-between"><span>Sensors / TPMS</span><span>$640</span></li>
            <li className="flex justify-between"><span>Field recovery</span><span className="text-[#D6403E]">TBD</span></li>
          </ul>
        </Panel>

        <Panel title="CYCLE TIME DISTRIBUTION">
          <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
            {[
              ['<16m', 18],
              ['16–19m', 42],
              ['19–22m', 28],
              ['>22m', 12],
            ].map(([label, pct]) => (
              <div key={label as string} className="rounded-md bg-[#0D1116] p-2">
                <div className="text-[16px] font-semibold text-[#1ADBDE]">{pct}%</div>
                <div className="text-[#6A737C]">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[#5A636C]">Based on {FLEET.length} assets sample · demo dataset</p>
        </Panel>
      </div>
    </PageShell>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#2A3036] bg-[#12171C] p-3">
      <h3 className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-[#8A949C]">{title}</h3>
      {children}
    </div>
  );
}
