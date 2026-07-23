import type { AssetStatus, Connectivity, EngineState, Priority, WorkOrderStatus } from '../../types/fms';

const COLORS: Record<string, string> = {
  Active: '#3AC7A3',
  Loading: '#1ADBDE',
  Hauling: '#1ADBDE',
  Dumping: '#3AC7A3',
  Waiting: '#F6A214',
  Idle: '#A8B0B7',
  Maintenance: '#F6A214',
  Breakdown: '#D6403E',
  Offline: '#6A737C',
  Running: '#3AC7A3',
  Off: '#6A737C',
  Fault: '#D6403E',
  Online: '#3AC7A3',
  Degraded: '#F6A214',
  Open: '#1ADBDE',
  'In Progress': '#F6A214',
  'Parts Hold': '#A8B0B7',
  Completed: '#3AC7A3',
  Cancelled: '#6A737C',
  Queued: '#A8B0B7',
  Low: '#8A949C',
  Normal: '#1ADBDE',
  High: '#F6A214',
  Critical: '#D6403E',
  good: '#3AC7A3',
  watch: '#F6A214',
  critical: '#D6403E',
  neutral: '#8A949C',
};

export default function StatusBadge({
  value,
  size = 'sm',
}: {
  value: string | AssetStatus | EngineState | Connectivity | WorkOrderStatus | Priority;
  size?: 'sm' | 'md';
}) {
  const color = COLORS[value] ?? '#8A949C';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold tracking-wide ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      }`}
      style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}33` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {value}
    </span>
  );
}
