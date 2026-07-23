import { Package } from 'lucide-react';
import { useMemo, useState } from 'react';
import DataTable, { type Column } from '../components/ui/DataTable';
import PageShell, { StatTile } from '../components/ui/PageShell';
import StatusBadge from '../components/ui/StatusBadge';

interface SparePart {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  supplier: string;
  lastPurchase: string;
  unitCost: number;
  used30d: number;
}

const PARTS: SparePart[] = [
  { id: '1', sku: 'SP-TR-441', name: 'Transmission cooler assembly', category: 'Powertrain', stock: 2, minStock: 2, unit: 'ea', supplier: 'Cat Parts NA', lastPurchase: '2025-09-12', unitCost: 1840, used30d: 1 },
  { id: '2', sku: 'SP-PIN-088', name: 'Bucket pin kit (EX class)', category: 'Undercarriage', stock: 6, minStock: 4, unit: 'kit', supplier: 'Komatsu OEM', lastPurchase: '2025-10-02', unitCost: 320, used30d: 2 },
  { id: '3', sku: 'SP-TPMS-12', name: 'TPMS sensor module', category: 'Sensors', stock: 1, minStock: 4, unit: 'ea', supplier: 'MineSense', lastPurchase: '2025-08-21', unitCost: 145, used30d: 3 },
  { id: '4', sku: 'SP-FLT-019', name: 'Hydraulic filter set', category: 'Filters', stock: 18, minStock: 10, unit: 'set', supplier: 'FleetFilter Co', lastPurchase: '2025-10-18', unitCost: 86, used30d: 5 },
  { id: '5', sku: 'SP-BRK-220', name: 'Brake wear sensor harness', category: 'Brakes', stock: 3, minStock: 3, unit: 'ea', supplier: 'Cat Parts NA', lastPurchase: '2025-10-05', unitCost: 210, used30d: 1 },
  { id: '6', sku: 'SP-OIL-55G', name: 'Engine oil 15W-40 (55 gal)', category: 'Fluids', stock: 9, minStock: 6, unit: 'drum', supplier: 'Shell Industrial', lastPurchase: '2025-10-20', unitCost: 640, used30d: 4 },
  { id: '7', sku: 'SP-TIR-240', name: 'Haul truck tire 24.00R35', category: 'Tires', stock: 4, minStock: 6, unit: 'ea', supplier: 'Michelin Mining', lastPurchase: '2025-07-30', unitCost: 6200, used30d: 2 },
  { id: '8', sku: 'SP-RAD-07', name: 'UHF radio handset', category: 'Comms', stock: 12, minStock: 5, unit: 'ea', supplier: 'Motorola Solutions', lastPurchase: '2025-09-28', unitCost: 390, used30d: 0 },
];

export default function SparePartsPage() {
  const [rows] = useState(PARTS);

  const lowStock = useMemo(() => rows.filter((r) => r.stock <= r.minStock).length, [rows]);
  const inventoryValue = useMemo(
    () => rows.reduce((s, r) => s + r.stock * r.unitCost, 0),
    [rows],
  );

  const columns: Column<SparePart>[] = [
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      sortValue: (r) => r.sku,
      render: (r) => <span className="font-mono text-[#1ADBDE]">{r.sku}</span>,
    },
    {
      key: 'name',
      header: 'PART',
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-medium text-[#E8ECEF]">{r.name}</span>,
    },
    { key: 'cat', header: 'CATEGORY', render: (r) => r.category },
    {
      key: 'stock',
      header: 'STOCK',
      sortable: true,
      sortValue: (r) => r.stock,
      render: (r) => (
        <span style={{ color: r.stock <= r.minStock ? '#D6403E' : '#3AC7A3' }}>
          {r.stock} {r.unit}
        </span>
      ),
    },
    {
      key: 'min',
      header: 'MIN',
      sortValue: (r) => r.minStock,
      sortable: true,
      render: (r) => r.minStock,
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (r) => (
        <StatusBadge value={r.stock <= r.minStock ? 'Critical' : r.stock <= r.minStock + 2 ? 'High' : 'Normal'} />
      ),
    },
    { key: 'sup', header: 'SUPPLIER', render: (r) => <span className="text-[#8A949C]">{r.supplier}</span> },
    { key: 'buy', header: 'LAST PURCHASE', render: (r) => r.lastPurchase },
    {
      key: 'cost',
      header: 'UNIT COST',
      sortable: true,
      sortValue: (r) => r.unitCost,
      render: (r) => `$${r.unitCost.toLocaleString()}`,
    },
    {
      key: 'use',
      header: 'USED 30D',
      sortable: true,
      sortValue: (r) => r.used30d,
      render: (r) => r.used30d,
    },
  ];

  return (
    <PageShell
      title="SPARE PARTS"
      subtitle="Inventory · stock levels · suppliers · purchase & usage history"
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="SKUs" value={rows.length} tone="cyan" />
        <StatTile label="LOW STOCK" value={lowStock} tone="red" hint="At or below min" />
        <StatTile label="INVENTORY VALUE" value={`$${inventoryValue.toLocaleString()}`} tone="amber" />
        <StatTile
          label="USAGE 30D"
          value={rows.reduce((s, r) => s + r.used30d, 0)}
          hint="Parts issued"
        />
      </div>

      {lowStock > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#D6403E]/30 bg-[#1A1212] px-3 py-2 text-[11px] text-[#D6403E]">
          <Package className="h-3.5 w-3.5" />
          {lowStock} SKU(s) require reorder before next maintenance window.
        </div>
      )}

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search SKU, part, supplier…"
        searchFn={(r, q) =>
          r.sku.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.supplier.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
        }
        emptyTitle="No spare parts found"
      />
    </PageShell>
  );
}
