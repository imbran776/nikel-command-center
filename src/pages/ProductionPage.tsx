import { useMemo, useState } from 'react';
import PageShell, { StatTile } from '../components/ui/PageShell';
import { DAILY_PRODUCTION, HOURLY_PRODUCTION } from '../data/enterprise';

type Range = 'hourly' | 'daily' | 'weekly' | 'monthly';

export default function ProductionPage() {
  const [range, setRange] = useState<Range>('hourly');

  const series = useMemo(() => {
    if (range === 'hourly') return HOURLY_PRODUCTION;
    if (range === 'daily') return DAILY_PRODUCTION;
    if (range === 'weekly') {
      return [
        { label: 'W1', actual: 268000, target: 270000 },
        { label: 'W2', actual: 275500, target: 270000 },
        { label: 'W3', actual: 262000, target: 270000 },
        { label: 'W4', actual: 281200, target: 270000 },
      ];
    }
    return [
      { label: 'Jul', actual: 1.05e6, target: 1.08e6 },
      { label: 'Aug', actual: 1.12e6, target: 1.08e6 },
      { label: 'Sep', actual: 1.09e6, target: 1.08e6 },
      { label: 'Oct', actual: 0.92e6, target: 1.08e6 },
    ];
  }, [range]);

  const maxY = Math.max(...series.map((s) => Math.max(s.actual, s.target)), 1);
  const totalActual = series.reduce((s, p) => s + p.actual, 0);
  const totalTarget = series.reduce((s, p) => s + p.target, 0);

  return (
    <PageShell
      title="PRODUCTION"
      subtitle="Target vs actual · trips · tonnes · cycle performance"
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['hourly', 'daily', 'weekly', 'monthly'] as Range[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${
              range === r ? 'bg-[#1ADBDE] text-[#0D1116]' : 'bg-[#1A2026] text-[#8A949C]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="ACTUAL" value={fmt(totalActual)} tone="cyan" />
        <StatTile label="TARGET" value={fmt(totalTarget)} tone="amber" />
        <StatTile
          label="VARIANCE"
          value={`${totalActual >= totalTarget ? '+' : ''}${fmt(totalActual - totalTarget)}`}
          tone={totalActual >= totalTarget ? 'green' : 'red'}
        />
        <StatTile
          label="ACHIEVEMENT"
          value={`${((totalActual / Math.max(1, totalTarget)) * 100).toFixed(1)}%`}
          tone="green"
        />
      </div>

      <div className="mb-4 rounded-lg border border-[#2A3036] bg-[#12171C] p-3">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-[#8A949C]">
          TARGET VS ACTUAL
        </div>
        <div className="flex h-48 items-end gap-2">
          {series.map((p) => (
            <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="relative flex h-40 w-full items-end justify-center gap-0.5">
                <div
                  className="w-[40%] max-w-[18px] rounded-t-sm bg-[#F6A214]/80"
                  style={{ height: `${(p.target / maxY) * 100}%` }}
                  title={`Target ${fmt(p.target)}`}
                />
                <div
                  className="w-[40%] max-w-[18px] rounded-t-sm bg-[#1ADBDE]"
                  style={{ height: `${(p.actual / maxY) * 100}%` }}
                  title={`Actual ${fmt(p.actual)}`}
                />
              </div>
              <span className="text-[9px] text-[#5A636C]">{p.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-[10px] text-[#6A737C]">
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-sm bg-[#1ADBDE]" /> Actual
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-sm bg-[#F6A214]/80" /> Target
          </span>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-[#2A3036]">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-[#1A1F24] text-[10px] tracking-wider text-[#6A737C]">
            <tr>
              <th className="px-3 py-2">PERIOD</th>
              <th className="px-3 py-2">ACTUAL (t)</th>
              <th className="px-3 py-2">TARGET (t)</th>
              <th className="px-3 py-2">DELTA</th>
              <th className="px-3 py-2">%</th>
            </tr>
          </thead>
          <tbody>
            {series.map((p) => {
              const d = p.actual - p.target;
              const pct = p.target ? (p.actual / p.target) * 100 : 0;
              return (
                <tr key={p.label} className="border-t border-[#1E242A]">
                  <td className="px-3 py-2 font-mono text-[#C8D0D6]">{p.label}</td>
                  <td className="px-3 py-2">{fmt(p.actual)}</td>
                  <td className="px-3 py-2 text-[#8A949C]">{fmt(p.target)}</td>
                  <td className="px-3 py-2" style={{ color: d >= 0 ? '#3AC7A3' : '#D6403E' }}>
                    {d >= 0 ? '+' : ''}
                    {fmt(d)}
                  </td>
                  <td className="px-3 py-2">{pct.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

function fmt(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return Math.round(n).toLocaleString();
}
