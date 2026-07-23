import { useMemo } from 'react';
import PageShell, { StatTile } from '../components/ui/PageShell';
import StatusBadge from '../components/ui/StatusBadge';
import { useOps } from '../contexts/OpsContext';
import type { AssetStatus } from '../types/fms';

const BUCKETS: AssetStatus[] = ['Loading', 'Hauling', 'Dumping', 'Waiting', 'Idle', 'Breakdown'];

export default function LiveOpsPage() {
  const { fleet, setActiveNav, openAssetDetail } = useOps();

  const groups = useMemo(() => {
    const map: Record<string, typeof fleet> = {};
    BUCKETS.forEach((b) => {
      map[b] = fleet.filter((f) => f.status === b || (b === 'Idle' && f.status === 'Active' && f.speedKph === 0 && f.type !== 'Excavator'));
    });
    // ensure excavators loading counted
    map.Loading = fleet.filter((f) => f.status === 'Loading');
    map.Idle = fleet.filter((f) => f.status === 'Idle');
    return map;
  }, [fleet]);

  const avgCycle =
    fleet.filter((f) => f.cycleMin > 0).reduce((s, f) => s + f.cycleMin, 0) /
      Math.max(1, fleet.filter((f) => f.cycleMin > 0).length);
  const queueWait = groups.Waiting?.length ?? 0;
  const shiftProgress = 62;
  const prodProgress = 106;

  return (
    <PageShell
      title="LIVE OPERATIONS"
      subtitle="Shift board · cycle state · queue visibility (map GPS integration later)"
      actions={
        <button
          type="button"
          onClick={() => setActiveNav('dispatch')}
          className="rounded-md bg-[#1ADBDE] px-3 py-1.5 text-[12px] font-semibold text-[#0D1116]"
        >
          Open dispatch
        </button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="AVG CYCLE" value={`${avgCycle.toFixed(1)} min`} tone="cyan" />
        <StatTile label="QUEUE UNITS" value={queueWait} tone="amber" hint="Waiting for load" />
        <StatTile label="SHIFT PROGRESS" value={`${shiftProgress}%`} tone="default" hint="Elapsed shift" />
        <StatTile label="PRODUCTION" value={`${prodProgress}%`} tone="green" hint="Of shift target" />
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#2A323A]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#1ADBDE] to-[#3AC7A3]" style={{ width: `${shiftProgress}%` }} />
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {BUCKETS.map((bucket) => (
          <div key={bucket} className="rounded-lg border border-[#2A3036] bg-[#12171C]">
            <div className="flex items-center justify-between border-b border-[#2A3036] px-3 py-2">
              <span className="text-[11px] font-semibold tracking-[0.1em] text-[#C8D0D6]">{bucket.toUpperCase()}</span>
              <StatusBadge value={bucket} />
            </div>
            <ul className="max-h-48 space-y-1 overflow-y-auto p-2">
              {(groups[bucket] ?? []).map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => openAssetDetail(u.id)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-[#1A2026]"
                  >
                    <div>
                      <div className="font-mono text-[12px] font-semibold text-[#E8ECEF]">{u.unit}</div>
                      <div className="text-[10px] text-[#6A737C]">{u.operator} · {u.location}</div>
                    </div>
                    <div className="text-right text-[10px] text-[#8A949C]">
                      <div>{u.speedKph} kph</div>
                      <div>{u.cycleMin > 0 ? `${u.cycleMin}m cyc` : '—'}</div>
                    </div>
                  </button>
                </li>
              ))}
              {!(groups[bucket] ?? []).length && (
                <li className="px-2 py-4 text-center text-[11px] text-[#5A636C]">No units</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
