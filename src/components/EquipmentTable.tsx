import {
  ChevronDown,
  ChevronUp,
  Filter,
  Flag,
  MapPin,
  MoreHorizontal,
  Radio,
  RefreshCw,
  User,
  Wrench,
} from 'lucide-react';
import { useOps } from '../contexts/OpsContext';
import type { SortDir, SortKey } from '../hooks/useEquipmentStatus';
import type { EquipmentRow, EquipmentStatus } from '../types/telemetry';
import DropdownMenu from './ui/DropdownMenu';

interface EquipmentTableProps {
  rows: EquipmentRow[];
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onLocate: (row: EquipmentRow) => void;
}

const STATUS_COLOR: Record<EquipmentStatus, string> = {
  Active: '#3AC7A3',
  Idle: '#A8B0B7',
  Maintenance: '#F6A214',
  Offline: '#6A737C',
};

function healthColor(h: number) {
  if (h >= 80) return '#1ADBDE';
  return '#F6A214';
}

const COLUMNS: { key: SortKey; label: string; width: string }[] = [
  { key: 'unit', label: 'UNIT', width: 'w-[14%]' },
  { key: 'type', label: 'TYPE', width: 'w-[22%]' },
  { key: 'status', label: 'STATUS', width: 'w-[14%]' },
  { key: 'driver', label: 'DRIVER', width: 'w-[18%]' },
  { key: 'health', label: 'HEALTH', width: 'w-[26%]' },
];

export default function EquipmentTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  onLocate,
}: EquipmentTableProps) {
  const {
    openModal,
    pushToast,
    flaggedUnits,
    toggleFlagUnit,
    equipmentFilter,
  } = useOps();

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#2A3036] bg-[#151A1F]">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold tracking-[0.12em] text-[#C8D0D6]">
            EQUIPMENT STATUS TABLE
          </h3>
          {(equipmentFilter.query ||
            equipmentFilter.status !== 'all' ||
            equipmentFilter.flaggedOnly) && (
            <span className="rounded bg-[#1A2A28] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#3AC7A3]">
              FILTERED · {rows.length}
            </span>
          )}
        </div>
        <DropdownMenu
          trigger={
            <button
              type="button"
              className="rounded p-0.5 text-[#5A636C] hover:bg-[#252B31] hover:text-[#A8B0B7]"
              aria-label="Table actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
          items={[
            {
              id: 'filter',
              label: 'Filter units…',
              icon: <Filter className="h-3.5 w-3.5" />,
              onSelect: () => openModal({ type: 'filter-equipment' }),
            },
            {
              id: 'refresh',
              label: 'Refresh feed',
              icon: <RefreshCw className="h-3.5 w-3.5" />,
              onSelect: () =>
                pushToast({
                  tone: 'info',
                  title: 'Telemetry refresh',
                  message: 'Equipment health snapshot re-synced.',
                }),
            },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-1 pb-1">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-[#2A3036]">
              {COLUMNS.map((col) => (
                <th key={col.key} className={`${col.width} px-3 py-1.5 text-left`}>
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.14em] text-[#6A737C] uppercase hover:text-[#A8B0B7]"
                  >
                    {col.label}
                    {sortKey === col.key &&
                      (sortDir === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      ))}
                  </button>
                </th>
              ))}
              <th className="w-[6%]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const flagged = flaggedUnits.has(row.unit);
              return (
                <tr
                  key={`${row.id}-${idx}`}
                  className={`border-b border-[#1E242A] last:border-0 hover:bg-[#1A1F24] ${
                    flagged ? 'bg-[#1A1814]' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-[12px] font-semibold tracking-wide text-[#E8ECEF]">
                    <span className="inline-flex items-center gap-1.5">
                      {row.unit}
                      {flagged && <Flag className="h-3 w-3 text-[#F6A214]" />}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] tracking-wide text-[#8A949C]">{row.type}</td>
                  <td className="px-3 py-2">
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: STATUS_COLOR[row.status] }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#A8B0B7]">
                      <User className="h-3 w-3 text-[#5A636C]" />
                      {row.driver}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-8 text-[12px] font-medium"
                        style={{ color: healthColor(row.health) }}
                      >
                        {row.health}%
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2A323A]">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${row.health}%`,
                            backgroundColor: healthColor(row.health),
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="relative px-1">
                    <DropdownMenu
                      trigger={
                        <button
                          type="button"
                          className="rounded p-0.5 text-[#5A636C] hover:bg-[#252B31] hover:text-[#A8B0B7]"
                          aria-label={`${row.unit} actions`}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      }
                      items={[
                        {
                          id: 'locate',
                          label: 'Locate unit',
                          icon: <MapPin className="h-3.5 w-3.5" />,
                          onSelect: () => {
                            onLocate(row);
                            pushToast({
                              tone: 'info',
                              title: `Locating ${row.unit}`,
                              message: 'Map focused on last known GPS fix.',
                            });
                          },
                        },
                        {
                          id: 'radio',
                          label: 'Driver radio',
                          icon: <Radio className="h-3.5 w-3.5" />,
                          onSelect: () =>
                            openModal({ type: 'radio', unit: row.unit, driver: row.driver }),
                        },
                        {
                          id: 'service',
                          label: 'Service log',
                          icon: <Wrench className="h-3.5 w-3.5" />,
                          onSelect: () =>
                            openModal({ type: 'service', unit: row.unit, driver: row.driver }),
                        },
                        {
                          id: 'flag',
                          label: flagged ? 'Unflag unit' : 'Flag unit',
                          icon: <Flag className="h-3.5 w-3.5" />,
                          onSelect: () => {
                            if (flagged) toggleFlagUnit(row.unit);
                            else openModal({ type: 'confirm-flag', unit: row.unit });
                          },
                        },
                        {
                          id: 'details',
                          label: 'Unit details',
                          onSelect: () => openModal({ type: 'unit', row }),
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[12px] text-[#6A737C]">
                  No units match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
