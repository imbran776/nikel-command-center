import { MoreHorizontal } from 'lucide-react';
import { useOps } from '../contexts/OpsContext';
import type { ProductionBar } from '../types/telemetry';
import DropdownMenu from './ui/DropdownMenu';

interface DailyProductionProps {
  bars: ProductionBar[];
  total: number;
  target: number;
  xLabels: string[];
}

/** Y scale matches reference: 0 → 42,000t */
const Y_TICKS: { value: number; label: string }[] = [
  { value: 42000, label: '42,000t' },
  { value: 40000, label: '40,000t' },
  { value: 30000, label: '30,000t' },
  { value: 20000, label: '20,000t' },
  { value: 10000, label: '10,000t' },
  { value: 0, label: '0' },
];

const CYAN = '#1ADBDE';
const AMBER = '#F6A214';
const MAX_Y = 45000;

/**
 * Reference layout: for EACH hour, two thin bars side-by-side
 * (cyan | amber), evenly spaced, hour label centered under the pair.
 */
export default function DailyProduction({
  bars,
  total,
  target,
}: DailyProductionProps) {
  const { pushToast, setActiveNav } = useOps();
  const targetPct = (target / MAX_Y) * 100;

  const hourly = bars
    .slice()
    .sort((a, b) => a.hour.localeCompare(b.hour))
    .filter((b, i, arr) => arr.findIndex((x) => x.hour === b.hour) === i);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#2A3036] bg-[#151A1F] px-3 py-2.5">
      {/* Header */}
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h3 className="text-[12px] font-semibold tracking-[0.1em] text-[#C8D0D6]">
            DAILY PRODUCTION
          </h3>
          <p className="mt-0.5 text-[10px] text-[#6A737C]">Tonnes</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-right text-[11px] leading-relaxed">
            <div className="text-[#8A949C]">
              Total:{' '}
              <span className="font-semibold text-[#E8ECEF]">{total.toLocaleString()}t</span>
            </div>
            <div className="text-[#F6A214]">
              Target:{' '}
              <span className="font-semibold">{target.toLocaleString()}t</span>
            </div>
          </div>
          <DropdownMenu
            trigger={
              <button
                type="button"
                className="rounded p-0.5 text-[#5A636C] hover:bg-[#252B31] hover:text-[#A8B0B7]"
                aria-label="Production actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
            items={[
              {
                id: 'desk',
                label: 'Open production desk',
                onSelect: () => setActiveNav('production'),
              },
              {
                id: 'analytics',
                label: 'Open analytics',
                onSelect: () => setActiveNav('analytics'),
              },
            ]}
          />
        </div>
      </div>

      {/* Chart body */}
      <div className="relative flex min-h-0 flex-1 gap-1 pt-1">
        {/* Y axis */}
        <div className="flex w-11 shrink-0 flex-col justify-between pb-[18px] pt-0.5 text-right">
          {Y_TICKS.map((t) => (
            <span key={t.value} className="text-[9px] leading-none text-[#5A636C]">
              {t.label}
            </span>
          ))}
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            {/* Grid */}
            {Y_TICKS.map((t) => (
              <div
                key={t.value}
                className="absolute left-0 right-0 border-t border-[#22282E]"
                style={{ bottom: `${(t.value / MAX_Y) * 100}%` }}
              />
            ))}

            {/* Target dashed line */}
            <div
              className="pointer-events-none absolute left-0 right-0 z-10 border-t border-dashed border-[#8A949C]/80"
              style={{ bottom: `${targetPct}%` }}
            >
              <span className="absolute -top-3.5 right-0 text-[9px] text-[#8A949C]">
                Target: {target.toLocaleString()}t
              </span>
            </div>

            {/*
              Equal-width hour slots. Inside each slot: two thin bars
              (cyan | amber) with a 2px gap, centered as a pair.
            */}
            <div className="absolute inset-0 flex items-end">
              {hourly.map((bar) => {
                const cyanH = Math.max(2, Math.min(100, (bar.primary / MAX_Y) * 100));
                const amberH = Math.max(2, Math.min(100, (bar.secondary / MAX_Y) * 100));

                return (
                  <div
                    key={bar.hour}
                    className="flex h-full min-w-0 flex-1 items-end justify-center"
                  >
                    {/* Pair of thin bars — fixed width so they don't get fat */}
                    <div className="flex h-full items-end gap-[2px]">
                      <button
                        type="button"
                        className="w-[7px] rounded-t-[1.5px] transition-all duration-500 hover:brightness-125 sm:w-[8px]"
                        style={{
                          height: `${cyanH}%`,
                          backgroundColor: CYAN,
                          boxShadow: `0 0 6px ${CYAN}55`,
                        }}
                        title={`${bar.hour} cyan: ${bar.primary.toLocaleString()}t`}
                        onClick={() =>
                          pushToast({
                            tone: 'info',
                            title: `${bar.hour} · cyan`,
                            message: `${bar.primary.toLocaleString()} t`,
                          })
                        }
                      />
                      <button
                        type="button"
                        className="w-[7px] rounded-t-[1.5px] transition-all duration-500 hover:brightness-125 sm:w-[8px]"
                        style={{
                          height: `${amberH}%`,
                          backgroundColor: AMBER,
                          boxShadow: `0 0 6px ${AMBER}55`,
                        }}
                        title={`${bar.hour} amber: ${bar.secondary.toLocaleString()}t`}
                        onClick={() =>
                          pushToast({
                            tone: 'info',
                            title: `${bar.hour} · amber`,
                            message: `${bar.secondary.toLocaleString()} t`,
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hour labels — same flex slots as bars so they line up */}
          <div className="mt-1.5 flex">
            {hourly.map((bar) => (
              <div key={`lbl-${bar.hour}`} className="min-w-0 flex-1 text-center">
                <span className="text-[8px] tabular-nums tracking-tight text-[#6A737C] sm:text-[9px]">
                  {bar.hour}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
