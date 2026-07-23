import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}

export default function PageShell({ title, subtitle, actions, children, flush }: PageShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#2A3036] bg-[#151A1F]">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[#2A3036] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-[0.08em] text-[#E8ECEF]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-[#7A848C]">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className={`min-h-0 flex-1 overflow-auto ${flush ? '' : 'p-3'}`}>{children}</div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'cyan' | 'amber' | 'green' | 'red';
}) {
  const color =
    tone === 'cyan'
      ? '#1ADBDE'
      : tone === 'amber'
        ? '#F6A214'
        : tone === 'green'
          ? '#3AC7A3'
          : tone === 'red'
            ? '#D6403E'
            : '#E8ECEF';
  return (
    <div className="rounded-lg border border-[#2A3036] bg-[#12171C] px-3 py-2.5">
      <div className="text-[10px] font-semibold tracking-[0.12em] text-[#6A737C]">{label}</div>
      <div className="mt-1 text-[18px] font-semibold tabular-nums" style={{ color }}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[10px] text-[#5A636C]">{hint}</div>}
    </div>
  );
}
