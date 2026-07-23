import { useOps } from '../../contexts/OpsContext';
import type { ProductionBar } from '../../types/telemetry';
import { GhostBtn } from '../ui/ModalShell';

interface ProductionPanelProps {
  bars: ProductionBar[];
  total: number;
  target: number;
}

export default function ProductionPanel({ bars, total, target }: ProductionPanelProps) {
  const { setActiveNav } = useOps();
  const variance = total - target;
  const pct = Math.round((total / target) * 1000) / 10;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-[#2A3036] bg-[#151A1F]">
      <div className="flex items-center justify-between border-b border-[#2A3036] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-[0.1em] text-[#E8ECEF]">
            PRODUCTION DESK
          </h2>
          <p className="mt-0.5 text-[11px] text-[#7A848C]">Shift analytics · tonnes moved</p>
        </div>
        <GhostBtn onClick={() => setActiveNav('dashboard')}>Back</GhostBtn>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <Stat label="Total moved" value={`${total.toLocaleString()} t`} />
        <Stat label="Shift target" value={`${target.toLocaleString()} t`} tone="amber" />
        <Stat
          label="Variance"
          value={`${variance >= 0 ? '+' : ''}${variance.toLocaleString()} t (${pct}%)`}
          tone={variance >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#2A3036] text-[10px] tracking-wider text-[#6A737C]">
              <th className="py-2 font-semibold">HOUR</th>
              <th className="py-2 font-semibold">ORE</th>
              <th className="py-2 font-semibold">WASTE</th>
              <th className="py-2 font-semibold">TOTAL</th>
              <th className="py-2 font-semibold">VS TARGET/HR</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((b) => {
              const sum = b.primary + b.secondary;
              const thr = target / bars.length;
              const delta = sum - thr;
              return (
                <tr key={b.hour} className="border-b border-[#1E242A] text-[12px]">
                  <td className="py-2 font-mono text-[#C8D0D6]">{b.hour}</td>
                  <td className="py-2 text-[#1ADBDE]">{b.primary.toLocaleString()}</td>
                  <td className="py-2 text-[#F6A214]">{b.secondary.toLocaleString()}</td>
                  <td className="py-2 text-[#E8ECEF]">{sum.toLocaleString()}</td>
                  <td
                    className="py-2 font-medium"
                    style={{ color: delta >= 0 ? '#3AC7A3' : '#D6403E' }}
                  >
                    {delta >= 0 ? '+' : ''}
                    {Math.round(delta).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'white',
}: {
  label: string;
  value: string;
  tone?: 'white' | 'amber' | 'green' | 'red';
}) {
  const color =
    tone === 'amber'
      ? '#F6A214'
      : tone === 'green'
        ? '#3AC7A3'
        : tone === 'red'
          ? '#D6403E'
          : '#E8ECEF';
  return (
    <div className="rounded-lg border border-[#2A3036] bg-[#12171C] px-3 py-2.5">
      <div className="text-[10px] tracking-wider text-[#6A737C]">{label}</div>
      <div className="mt-1 text-[16px] font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
