import { useState } from 'react';
import { useOps } from '../contexts/OpsContext';
import ModalShell, { GhostBtn, PrimaryBtn } from './ui/ModalShell';

export default function ModalsHost() {
  const {
    modal,
    closeModal,
    pushToast,
    toggleFlagUnit,
    equipmentFilter,
    setEquipmentFilter,
    mapLayers,
    setMapLayer,
    settings,
    updateSettings,
  } = useOps();

  if (!modal) return null;

  if (modal.type === 'unit') {
    const { row } = modal;
    return (
      <ModalShell
        title={`Unit ${row.unit}`}
        subtitle={`${row.type} · ${row.driver}`}
        onClose={closeModal}
        footer={
          <>
            <GhostBtn onClick={closeModal}>Close</GhostBtn>
            <PrimaryBtn
              tone="cyan"
              onClick={() => {
                pushToast({
                  tone: 'info',
                  title: 'Unit dossier opened',
                  message: `${row.unit} full history requested from fleet API.`,
                });
                closeModal();
              }}
            >
              Open full dossier
            </PrimaryBtn>
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-3 text-[12px]">
          <Item label="Status" value={row.status} />
          <Item label="Health" value={`${row.health}%`} />
          <Item label="Driver" value={row.driver} />
          <Item label="Type" value={row.type} />
        </dl>
      </ModalShell>
    );
  }

  if (modal.type === 'radio') {
    return (
      <RadioModal
        unit={modal.unit}
        driver={modal.driver}
        onClose={closeModal}
        onSend={(msg) => {
          pushToast({
            tone: 'success',
            title: `Radio TX → ${modal.unit}`,
            message: msg || `Channel open with ${modal.driver}.`,
          });
          closeModal();
        }}
      />
    );
  }

  if (modal.type === 'service') {
    return (
      <ServiceModal
        unit={modal.unit}
        driver={modal.driver}
        onClose={closeModal}
        onCreate={(note) => {
          pushToast({
            tone: 'success',
            title: 'Service log created',
            message: `${modal.unit}: ${note.slice(0, 80)}`,
          });
          closeModal();
        }}
      />
    );
  }

  if (modal.type === 'confirm-flag') {
    return (
      <ModalShell
        title={`Flag unit ${modal.unit}?`}
        subtitle="Adds asset to priority watch for this shift"
        onClose={closeModal}
        footer={
          <>
            <GhostBtn onClick={closeModal}>Cancel</GhostBtn>
            <PrimaryBtn
              tone="amber"
              onClick={() => {
                toggleFlagUnit(modal.unit);
                closeModal();
              }}
            >
              Confirm flag
            </PrimaryBtn>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-[#A8B0B7]">
          Flagged units surface in fleet priority filters and raise maintenance attention on the
          next dispatch cycle. This action is logged under shift {settings.shiftCode}.
        </p>
      </ModalShell>
    );
  }

  if (modal.type === 'filter-equipment') {
    return (
      <FilterModal
        filter={equipmentFilter}
        onClose={closeModal}
        onApply={(f) => {
          setEquipmentFilter(f);
          pushToast({ tone: 'info', title: 'Equipment filter applied' });
          closeModal();
        }}
      />
    );
  }

  if (modal.type === 'map-settings') {
    return (
      <ModalShell
        title="Map display settings"
        subtitle="Toggle operational layers"
        onClose={closeModal}
        footer={
          <>
            <GhostBtn onClick={closeModal}>Close</GhostBtn>
            <PrimaryBtn
              tone="cyan"
              onClick={() => {
                pushToast({ tone: 'success', title: 'Map layers updated' });
                closeModal();
              }}
            >
              Apply
            </PrimaryBtn>
          </>
        }
      >
        <div className="space-y-2">
          {(
            [
              ['haulRoads', 'Haul roads'],
              ['pitZones', 'Pit zone fills'],
              ['fleet', 'Fleet markers'],
              ['pins', 'Zone pins (B/C/E)'],
              ['labels', 'Road labels'],
              ['heat', 'Activity heat overlay'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between rounded-md px-2 py-2 hover:bg-[#1A2026]"
            >
              <span className="text-[12px] text-[#C8D0D6]">{label}</span>
              <input
                type="checkbox"
                checked={mapLayers[key]}
                onChange={(e) => setMapLayer(key, e.target.checked)}
                className="h-4 w-4 accent-[#1ADBDE]"
              />
            </label>
          ))}
        </div>
      </ModalShell>
    );
  }

  if (modal.type === 'settings') {
    return (
      <ModalShell
        title="Quick settings"
        subtitle="Session preferences"
        onClose={closeModal}
        footer={<GhostBtn onClick={closeModal}>Close</GhostBtn>}
      >
        <div className="space-y-2">
          <QuickToggle
            label="Auto-refresh"
            checked={settings.autoRefresh}
            onChange={(v) => updateSettings({ autoRefresh: v })}
          />
          <QuickToggle
            label="Sound alerts"
            checked={settings.soundAlerts}
            onChange={(v) => updateSettings({ soundAlerts: v })}
          />
          <QuickToggle
            label="Metric units"
            checked={settings.unitsMetric}
            onChange={(v) => updateSettings({ unitsMetric: v })}
          />
        </div>
      </ModalShell>
    );
  }

  if (modal.type === 'shift-report') {
    return (
      <ModalShell
        title="Generate shift report"
        subtitle={`${settings.siteCode} · ${settings.shiftCode}`}
        onClose={closeModal}
        footer={
          <>
            <GhostBtn onClick={closeModal}>Cancel</GhostBtn>
            <PrimaryBtn
              tone="amber"
              onClick={() => {
                pushToast({
                  tone: 'success',
                  title: 'Shift report queued',
                  message: `${settings.siteCode} · ${settings.shiftCode} · handoff package prepared for archive.`,
                });
                closeModal();
              }}
            >
              Confirm generate
            </PrimaryBtn>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-[#A8B0B7]">
          Compiles production totals, open alerts, flagged assets, and maintenance queue into a
          shift handoff package for the next ops lead.
        </p>
      </ModalShell>
    );
  }

  if (modal.type === 'export-preview') {
    return null;
  }

  if (modal.type === 'asset') {
    const { asset } = modal;
    return (
      <ModalShell
        title={asset.unit}
        subtitle={`${asset.type} · ${asset.operator}`}
        onClose={closeModal}
        footer={
          <>
            <GhostBtn onClick={closeModal}>Close</GhostBtn>
            <PrimaryBtn tone="cyan" onClick={closeModal}>
              Done
            </PrimaryBtn>
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-3 text-[12px]">
          <Item label="Status" value={asset.status} />
          <Item label="Health" value={`${asset.health}%`} />
          <Item label="Fuel" value={`${asset.fuelPct}%`} />
          <Item label="Location" value={asset.location} />
        </dl>
      </ModalShell>
    );
  }

  if (modal.type === 'assign') {
    return (
      <AssignModal
        unit={modal.unit}
        onClose={closeModal}
        onAssign={(payload) => {
          pushToast({
            tone: 'success',
            title: 'Assignment saved',
            message: `${payload.truck} → ${payload.excavator} · ${payload.load} to ${payload.dump}`,
          });
          closeModal();
        }}
      />
    );
  }

  if (modal.type === 'confirm') {
    return (
      <ModalShell
        title={modal.title}
        onClose={closeModal}
        footer={
          <>
            <GhostBtn onClick={closeModal}>Cancel</GhostBtn>
            <PrimaryBtn
              tone="danger"
              onClick={() => {
                modal.onConfirm();
                closeModal();
              }}
            >
              {modal.actionLabel}
            </PrimaryBtn>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-[#A8B0B7]">{modal.message}</p>
      </ModalShell>
    );
  }

  return null;
}

function AssignModal({
  unit,
  onClose,
  onAssign,
}: {
  unit?: string;
  onClose: () => void;
  onAssign: (p: { truck: string; excavator: string; load: string; dump: string; priority: string }) => void;
}) {
  const [truck, setTruck] = useState(unit ?? 'HT-11');
  const [excavator, setExcavator] = useState('EX-01');
  const [load, setLoad] = useState('Face C');
  const [dump, setDump] = useState('Crusher Pad');
  const [priority, setPriority] = useState('Normal');

  return (
    <ModalShell
      title="Assign / reassign"
      subtitle="Create dispatch job for loading circuit"
      onClose={onClose}
      widthClass="max-w-lg"
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn
            tone="cyan"
            onClick={() => onAssign({ truck, excavator, load, dump, priority })}
          >
            Confirm assignment
          </PrimaryBtn>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Truck" value={truck} onChange={setTruck} options={['HT-04', 'HT-06', 'HT-09', 'HT-11', 'HT-14']} />
        <Field label="Excavator" value={excavator} onChange={setExcavator} options={['EX-01', 'EX-03', '—']} />
        <Field label="Loading point" value={load} onChange={setLoad} options={['Face B', 'Face C', 'Stockpile West', 'Fill Station']} />
        <Field label="Dump point" value={dump} onChange={setDump} options={['Crusher Pad', 'Dump East', 'Haul Road N']} />
        <Field label="Priority" value={priority} onChange={setPriority} options={['Low', 'Normal', 'High', 'Critical']} />
      </div>
    </ModalShell>
  );
}

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] tracking-wider text-[#6A737C]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[#2A3036] bg-[#0D1116] px-2.5 py-1.5 text-[12px] text-[#E8ECEF] outline-none focus:border-[#1ADBDE]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-wider text-[#6A737C]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#E8ECEF]">{value}</dd>
    </div>
  );
}

function QuickToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-md px-2 py-2 hover:bg-[#1A2026]"
    >
      <span className="text-[12px] text-[#C8D0D6]">{label}</span>
      <span className={`text-[11px] font-semibold ${checked ? 'text-[#3AC7A3]' : 'text-[#6A737C]'}`}>
        {checked ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

function RadioModal({
  unit,
  driver,
  onClose,
  onSend,
}: {
  unit: string;
  driver: string;
  onClose: () => void;
  onSend: (msg: string) => void;
}) {
  const [msg, setMsg] = useState('Return to load-out after dump cycle.');
  const presets = [
    'Hold position — traffic clear in 2 min.',
    'Proceed to crusher pad.',
    'Return to load-out after dump cycle.',
    'Report to workshop bay 2.',
  ];
  return (
    <ModalShell
      title={`Driver radio · ${unit}`}
      subtitle={`Operator ${driver} · CH-7 encrypted`}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn tone="cyan" onClick={() => onSend(msg)}>
            Transmit
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setMsg(p)}
              className="rounded-full border border-[#2A3036] px-2 py-1 text-[10px] text-[#8A949C] hover:border-[#1ADBDE] hover:text-[#C8D0D6]"
            >
              {p}
            </button>
          ))}
        </div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-[#2A3036] bg-[#0D1116] px-2.5 py-2 text-[12px] text-[#E8ECEF] outline-none focus:border-[#1ADBDE]"
        />
      </div>
    </ModalShell>
  );
}

function ServiceModal({
  unit,
  driver,
  onClose,
  onCreate,
}: {
  unit: string;
  driver: string;
  onClose: () => void;
  onCreate: (note: string) => void;
}) {
  const [note, setNote] = useState(`Routine inspection requested by ${driver}.`);
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Critical'>('Normal');
  return (
    <ModalShell
      title={`Service log · ${unit}`}
      subtitle="Create workshop work order"
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn tone="amber" onClick={() => onCreate(`[${priority}] ${note}`)}>
            Create work order
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['Normal', 'High', 'Critical'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                priority === p
                  ? p === 'Critical'
                    ? 'bg-[#D6403E] text-white'
                    : p === 'High'
                      ? 'bg-[#F6A214] text-[#0D1116]'
                      : 'bg-[#1ADBDE] text-[#0D1116]'
                  : 'bg-[#252B31] text-[#8A949C]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-md border border-[#2A3036] bg-[#0D1116] px-2.5 py-2 text-[12px] text-[#E8ECEF] outline-none focus:border-[#F6A214]"
        />
      </div>
    </ModalShell>
  );
}

function FilterModal({
  filter,
  onClose,
  onApply,
}: {
  filter: { status: string; query: string; flaggedOnly: boolean };
  onClose: () => void;
  onApply: (f: { status: 'all' | 'Active' | 'Idle' | 'Maintenance' | 'Offline'; query: string; flaggedOnly: boolean }) => void;
}) {
  const [status, setStatus] = useState(filter.status);
  const [query, setQuery] = useState(filter.query);
  const [flaggedOnly, setFlaggedOnly] = useState(filter.flaggedOnly);
  return (
    <ModalShell
      title="Filter equipment"
      subtitle="Narrow the status table"
      onClose={onClose}
      footer={
        <>
          <GhostBtn
            onClick={() => {
              setStatus('all');
              setQuery('');
              setFlaggedOnly(false);
            }}
          >
            Clear
          </GhostBtn>
          <PrimaryBtn
            tone="cyan"
            onClick={() =>
              onApply({
                status: status as 'all' | 'Active' | 'Idle' | 'Maintenance' | 'Offline',
                query,
                flaggedOnly,
              })
            }
          >
            Apply filter
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[10px] tracking-wider text-[#6A737C]">Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Unit, type, or driver"
            className="w-full rounded-md border border-[#2A3036] bg-[#0D1116] px-2.5 py-1.5 text-[12px] text-[#E8ECEF] outline-none focus:border-[#1ADBDE]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] tracking-wider text-[#6A737C]">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-[#2A3036] bg-[#0D1116] px-2.5 py-1.5 text-[12px] text-[#E8ECEF] outline-none focus:border-[#1ADBDE]"
          >
            {['all', 'Active', 'Idle', 'Maintenance', 'Offline'].map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All statuses' : s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[12px] text-[#C8D0D6]">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="accent-[#F6A214]"
          />
          Flagged units only
        </label>
      </div>
    </ModalShell>
  );
}
