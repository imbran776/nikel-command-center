import { useEffect, useMemo, useState } from 'react';
import { useOps } from '../contexts/OpsContext';
import { INITIAL_EQUIPMENT } from '../data/mockData';
import type { EquipmentRow } from '../types/telemetry';

type SortKey = 'unit' | 'type' | 'status' | 'driver' | 'health';
type SortDir = 'asc' | 'desc';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Mock equipment health stream — swap for REST/MySQL later */
export function useEquipmentStatus() {
  const { equipmentFilter, flaggedUnits, settings } = useOps();
  const [rows, setRows] = useState<EquipmentRow[]>(() =>
    INITIAL_EQUIPMENT.map((r) => ({ ...r })),
  );
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    if (!settings.autoRefresh) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          health: clamp(
            row.health + Math.round((Math.random() * 2 - 1) * 1.5),
            row.status === 'Maintenance' ? 30 : 60,
            99,
          ),
        })),
      );
    };
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [settings.autoRefresh]);

  const filtered = useMemo(() => {
    const q = equipmentFilter.query.trim().toLowerCase();
    return rows.filter((row) => {
      if (equipmentFilter.status !== 'all' && row.status !== equipmentFilter.status) return false;
      if (equipmentFilter.flaggedOnly && !flaggedUnits.has(row.unit)) return false;
      if (!q) return true;
      return (
        row.unit.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q) ||
        row.driver.toLowerCase().includes(q)
      );
    });
  }, [rows, equipmentFilter, flaggedUnits]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return { rows: sorted, allRows: rows, sortKey, sortDir, toggleSort, setRows };
}

export type { SortKey, SortDir };
