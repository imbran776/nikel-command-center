import { FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import PageShell from '../components/ui/PageShell';
import { useOps } from '../contexts/OpsContext';

const REPORTS = [
  { id: 'prod', name: 'Production Report', desc: 'Tonnes, trips, target vs actual by period' },
  { id: 'fuel', name: 'Fuel Report', desc: 'Consumption, cost, efficiency, refuel events' },
  { id: 'maint', name: 'Maintenance Report', desc: 'Work orders, cost, downtime, due services' },
  { id: 'equip', name: 'Equipment Report', desc: 'Health, hours, utilization, availability' },
  { id: 'ops', name: 'Operator Report', desc: 'Hours, performance, safety, attendance' },
  { id: 'trips', name: 'Trips Report', desc: 'Cycle times, payloads, destinations' },
  { id: 'avail', name: 'Availability Report', desc: 'Planned vs unplanned downtime' },
  { id: 'down', name: 'Downtime Report', desc: 'Breakdowns, MTTR contribution' },
];

export default function ReportsPage() {
  const { pushToast, settings, mine, shift } = useOps();
  const [selected, setSelected] = useState<string[]>(['prod', 'fuel']);
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const queuePackage = () => {
    if (!selected.length) {
      pushToast({ tone: 'warning', title: 'Select at least one report' });
      return;
    }
    const names = selected
      .map((id) => REPORTS.find((r) => r.id === id)?.name ?? id)
      .join(', ');
    pushToast({
      tone: 'success',
      title: `${format.toUpperCase()} package queued`,
      message: `${names} · ${mine.code} · ${shift.code} · ${settings.opsLead}`,
    });
  };

  return (
    <PageShell title="REPORTS" subtitle="Select operational packages · generate shift summary">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ['csv', FileText],
            ['excel', FileSpreadsheet],
            ['pdf', FileText],
          ] as const
        ).map(([f, Icon]) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase ${
              format === f
                ? 'border-[#1ADBDE] bg-[#1A2A2C] text-[#1ADBDE]'
                : 'border-[#2A3036] text-[#8A949C]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {f}
          </button>
        ))}
        <button
          type="button"
          onClick={queuePackage}
          className="ml-auto rounded-md bg-[#1ADBDE] px-3 py-1.5 text-[12px] font-semibold text-[#0D1116] hover:bg-[#4AE5E8]"
        >
          Queue package
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => {
          const on = selected.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                on
                  ? 'border-[#1ADBDE]/50 bg-[#121F22]'
                  : 'border-[#2A3036] bg-[#12171C] hover:border-[#3A424A]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-semibold text-[#E8ECEF]">{r.name}</div>
                <span
                  className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                    on ? 'border-[#1ADBDE] bg-[#1ADBDE] text-[#0D1116]' : 'border-[#3A424A]'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#7A848C]">{r.desc}</p>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
