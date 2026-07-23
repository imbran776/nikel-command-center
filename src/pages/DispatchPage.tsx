import { Plus } from 'lucide-react';
import { useState } from 'react';
import Button from '../components/ui/Button';
import DataTable, { type Column } from '../components/ui/DataTable';
import PageShell, { StatTile } from '../components/ui/PageShell';
import StatusBadge from '../components/ui/StatusBadge';
import { useOps } from '../contexts/OpsContext';
import { DISPATCH_QUEUE } from '../data/enterprise';
import type { DispatchJob } from '../types/fms';

export default function DispatchPage() {
  const { openModal, pushToast } = useOps();
  const [jobs, setJobs] = useState(DISPATCH_QUEUE);

  const columns: Column<DispatchJob>[] = [
    { key: 'id', header: 'JOB', sortable: true, sortValue: (r) => r.id, render: (r) => <span className="font-mono text-[#1ADBDE]">{r.id}</span> },
    { key: 'truck', header: 'TRUCK', sortable: true, sortValue: (r) => r.truck, render: (r) => r.truck },
    { key: 'ex', header: 'EXCAVATOR', render: (r) => r.excavator },
    { key: 'load', header: 'LOAD POINT', render: (r) => r.loadPoint },
    { key: 'dump', header: 'DUMP POINT', render: (r) => r.dumpPoint },
    { key: 'pri', header: 'PRIORITY', render: (r) => <StatusBadge value={r.priority} /> },
    { key: 'st', header: 'STATUS', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'eta', header: 'ETA', sortable: true, sortValue: (r) => r.etaMin, render: (r) => (r.etaMin ? `${r.etaMin} min` : '—') },
    { key: 'at', header: 'ASSIGNED', render: (r) => <span className="text-[#6A737C]">{r.assignedAt}</span> },
    {
      key: 'act',
      header: '',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {r.status === 'Queued' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setJobs((prev) => prev.map((j) => (j.id === r.id ? { ...j, status: 'Active' } : j)));
                pushToast({ tone: 'success', title: 'Dispatch activated', message: r.id });
              }}
            >
              Activate
            </Button>
          )}
          {r.status === 'Active' && (
            <Button
              size="sm"
              variant="success"
              onClick={() => {
                setJobs((prev) => prev.map((j) => (j.id === r.id ? { ...j, status: 'Completed', etaMin: 0 } : j)));
                pushToast({ tone: 'success', title: 'Job completed', message: r.id });
              }}
            >
              Complete
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => openModal({ type: 'assign', unit: r.truck })}>
            Reassign
          </Button>
        </div>
      ),
    },
  ];

  const queued = jobs.filter((j) => j.status === 'Queued').length;
  const active = jobs.filter((j) => j.status === 'Active').length;

  return (
    <PageShell
      title="DISPATCH BOARD"
      subtitle="Assign / reassign trucks · loading & dump points · priority queue"
      actions={
        <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => openModal({ type: 'assign' })}>
          New assignment
        </Button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="QUEUED" value={queued} tone="amber" />
        <StatTile label="ACTIVE" value={active} tone="cyan" />
        <StatTile label="COMPLETED" value={jobs.filter((j) => j.status === 'Completed').length} tone="green" />
        <StatTile label="HISTORY" value={jobs.length} hint="This shift" />
      </div>
      <DataTable
        rows={jobs}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search job, truck, excavator…"
        searchFn={(r, q) =>
          r.id.toLowerCase().includes(q) ||
          r.truck.toLowerCase().includes(q) ||
          r.excavator.toLowerCase().includes(q) ||
          r.loadPoint.toLowerCase().includes(q)
        }
        emptyTitle="Dispatch queue empty"
      />
    </PageShell>
  );
}
