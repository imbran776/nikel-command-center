import { HelpCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { KpiMetric } from '../../types/fms';
import StatusBadge from './StatusBadge';

const ACCENT: Record<KpiMetric['accent'], string> = {
  cyan: '#1ADBDE',
  amber: '#F6A214',
  green: '#3AC7A3',
  red: '#D6403E',
  muted: '#8A949C',
};

export default function KpiCard({ metric }: { metric: KpiMetric }) {
  const [tip, setTip] = useState(false);
  const color = ACCENT[metric.accent];
  const up = metric.trend >= 0;

  return (
    <div className="group relative flex min-h-[112px] flex-col rounded-xl border border-[#2A3036] bg-[#12171C] p-3 transition-colors hover:border-[#3A424A]">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-semibold tracking-[0.12em] text-[#8A949C]">
          {metric.label}
        </div>
        <div className="flex items-center gap-1">
          <StatusBadge value={metric.status} />
          <button
            type="button"
            className="rounded p-0.5 text-[#5A636C] hover:text-[#A8B0B7]"
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
            onFocus={() => setTip(true)}
            onBlur={() => setTip(false)}
            aria-label={`About ${metric.label}`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {tip && (
        <div className="absolute right-2 top-9 z-20 max-w-[200px] rounded-md border border-[#3A424A] bg-[#1A2026] px-2 py-1.5 text-[10px] leading-snug text-[#B0B8BE] shadow-xl">
          {metric.tooltip}
        </div>
      )}

      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-[24px] font-semibold tabular-nums tracking-tight" style={{ color }}>
          {metric.value}
        </span>
        {metric.unit && (
          <span className="text-[12px] font-medium text-[#7A848C]">{metric.unit}</span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2 text-[10px]">
        <span
          className="inline-flex items-center gap-0.5 font-semibold"
          style={{ color: up ? '#3AC7A3' : '#D6403E' }}
        >
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? '+' : ''}
          {metric.trend}%
        </span>
        <span className="text-[#5A636C]">vs {metric.prevShift}</span>
      </div>
      <div className="mt-1 text-[9px] tracking-wide text-[#4A545C]">
        Updated {metric.lastUpdated} · {metric.statusLabel}
      </div>
    </div>
  );
}
