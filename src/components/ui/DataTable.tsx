import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import Button from './Button';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchFn?: (row: T, q: string) => boolean;
  pageSizeOptions?: number[];
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (ids: string[]) => void;
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchPlaceholder = 'Search…',
  searchFn,
  pageSizeOptions = [8, 12, 24],
  toolbar,
  emptyTitle = 'No records',
  emptyHint = 'Try adjusting filters or search.',
  onRowClick,
  selectable,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!query.trim() || !searchFn) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => searchFn(r, q));
  }, [rows, query, searchFn]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const visibleCols = columns.filter((c) => !hidden.has(c.key));
  const pageIds = pageRows.map(rowKey);
  const allSelected = selectable && pageIds.length > 0 && pageIds.every((id) => selectedIds?.has(id));

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {searchFn && (
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5A636C]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md border border-[#2A3036] bg-[#0D1116] py-1.5 pl-8 pr-3 text-[12px] text-[#E8ECEF] outline-none placeholder:text-[#5A636C] focus:border-[#1ADBDE]/60"
            />
          </div>
        )}
        <div className="relative">
          <select
            className="h-8 appearance-none rounded-md border border-[#2A3036] bg-[#0D1116] px-2 pr-7 text-[11px] text-[#A8B0B7] outline-none focus:border-[#1ADBDE]/60"
            value=""
            onChange={(e) => {
              const k = e.target.value;
              if (!k) return;
              setHidden((prev) => {
                const next = new Set(prev);
                if (next.has(k)) next.delete(k);
                else next.add(k);
                return next;
              });
              e.target.value = '';
            }}
          >
            <option value="">Columns</option>
            {columns.map((c) => (
              <option key={c.key} value={c.key}>
                {hidden.has(c.key) ? `Show ${c.header}` : `Hide ${c.header}`}
              </option>
            ))}
          </select>
        </div>
        {toolbar}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#2A3036]">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#1A1F24]">
            <tr className="border-b border-[#2A3036]">
              {selectable && (
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!allSelected}
                    onChange={() => onToggleSelectAll?.(pageIds)}
                    className="accent-[#1ADBDE]"
                    aria-label="Select all on page"
                  />
                </th>
              )}
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-[10px] font-semibold tracking-[0.12em] text-[#6A737C] ${col.width ?? ''}`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-[#A8B0B7]"
                    >
                      {col.header}
                      {sortKey === col.key &&
                        (sortDir === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        ))}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const id = rowKey(row);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-[#1E242A] last:border-0 hover:bg-[#1A1F24] ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${selectedIds?.has(id) ? 'bg-[#151E22]' : ''}`}
                >
                  {selectable && (
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!selectedIds?.has(id)}
                        onChange={() => onToggleSelect?.(id)}
                        className="accent-[#1ADBDE]"
                      />
                    </td>
                  )}
                  {visibleCols.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-[12px] text-[#C8D0D6]">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!pageRows.length && (
              <tr>
                <td
                  colSpan={visibleCols.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="text-[13px] font-medium text-[#A8B0B7]">{emptyTitle}</div>
                  <div className="mt-1 text-[11px] text-[#5A636C]">{emptyHint}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6A737C]">
        <div>
          {sorted.length} record{sorted.length === 1 ? '' : 's'}
          {query ? ` · filtered` : ''}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="h-7 rounded border border-[#2A3036] bg-[#0D1116] px-1.5 text-[11px] text-[#A8B0B7]"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
          >
            Prev
          </Button>
          <span className="tabular-nums">
            {safePage + 1} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
