import { AlertTriangle, MoreHorizontal } from 'lucide-react';
import { useOps } from '../contexts/OpsContext';
import type { TelemetryKpi } from '../types/telemetry';
import DropdownMenu from './ui/DropdownMenu';

interface GaugeCardProps {
  kpi: TelemetryKpi;
}

const ACCENT = {
  amber: '#F6A214',
  cyan: '#1ADBDE',
} as const;

export default function GaugeCard({ kpi }: GaugeCardProps) {
  const { pushToast, setActiveNav, openModal } = useOps();
  const color = ACCENT[kpi.accent];
  const stroke = 10;
  const radius = 46;
  const arcLen = Math.PI * radius;
  const progress = Math.min(100, Math.max(0, kpi.gaugePercent)) / 100;
  const dash = progress * arcLen;

  const display =
    kpi.decimals != null ? kpi.value.toFixed(kpi.decimals) : String(Math.round(kpi.value));

  const mainColor = kpi.valueColor === 'amber' ? color : '#FFFFFF';
  const subColor = kpi.subtitleColor === 'amber' ? color : '#6A737C';

  return (
    <div className="relative flex min-h-[132px] flex-col rounded-xl border border-[#2A3036] bg-[#12171C] px-3 pb-2 pt-2.5">
      <div className="flex items-start justify-between gap-1">
        <h3 className="text-[11px] font-semibold tracking-[0.1em] text-[#D0D5D9]">{kpi.label}</h3>
        <div className="flex items-center gap-1">
          {kpi.warning && (
            <button
              type="button"
              title="Open related alerts"
              onClick={() => {
                setActiveNav('alerts');
                pushToast({
                  tone: 'warning',
                  title: kpi.label,
                  message: 'Opening alerts queue for this KPI.',
                });
              }}
              className="flex h-4 w-4 items-center justify-center text-[#F6A214]"
            >
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} fill="#F6A214" fillOpacity={0.2} />
            </button>
          )}
          <DropdownMenu
            widthClass="w-40"
            trigger={
              <button
                type="button"
                className="rounded p-0.5 text-[#5A636C] hover:bg-[#252B31] hover:text-[#A8B0B7]"
                aria-label={`${kpi.label} menu`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            }
            items={[
              {
                id: 'detail',
                label: 'View details',
                onSelect: () =>
                  pushToast({
                    tone: 'info',
                    title: kpi.label,
                    message: `Current reading ${display}${kpi.unit}${kpi.subtitle ? ` · ${kpi.subtitle}` : ''}`,
                  }),
              },
              {
                id: 'threshold',
                label: 'Set threshold…',
                onSelect: () => openModal({ type: 'settings' }),
              },
              {
                id: 'alerts',
                label: 'Related alerts',
                onSelect: () => setActiveNav('alerts'),
              },
            ]}
          />
        </div>
      </div>

      <div className="mt-1 flex flex-1 flex-col items-center justify-end">
        <div className="relative h-[88px] w-[148px]">
          <svg viewBox="0 0 140 78" className="absolute inset-0 h-full w-full overflow-visible">
            <path
              d="M 18 68 A 52 52 0 0 1 122 68"
              fill="none"
              stroke="#2A323A"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            <path
              d="M 18 68 A 52 52 0 0 1 122 68"
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash * (52 / radius)} ${arcLen * (52 / radius)}`}
              className="transition-[stroke-dasharray] duration-700 ease-out"
              style={{ filter: `drop-shadow(0 0 8px ${color}aa)` }}
            />
          </svg>

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-0">
            <div className="flex items-baseline gap-0.5 leading-none">
              <span className="text-[28px] font-semibold tracking-tight" style={{ color: mainColor }}>
                {display}
              </span>
              <span
                className="text-[13px] font-medium"
                style={{ color: kpi.valueColor === 'amber' ? color : '#A8B0B7' }}
              >
                {kpi.unit}
              </span>
            </div>
            {kpi.subtitle ? (
              <span className="mt-0.5 text-[12px] font-medium" style={{ color: subColor }}>
                {kpi.subtitle}
              </span>
            ) : (
              <span className="mt-0.5 h-[16px]" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
