import { UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import DataTable, { type Column } from '../components/ui/DataTable';
import PageShell, { StatTile } from '../components/ui/PageShell';
import ProfileEditorModal from '../components/ui/ProfileEditorModal';
import StatusBadge from '../components/ui/StatusBadge';
import UserAvatar from '../components/ui/UserAvatar';
import { useAuth } from '../contexts/AuthContext';
import { useOps } from '../contexts/OpsContext';
import type { PublicAuthUser } from '../data/authUsers';

export default function UsersPage() {
  const { directory, updateProfile, user: me } = useAuth();
  const { pushToast } = useOps();
  const [editing, setEditing] = useState<PublicAuthUser | null>(null);

  const users = directory;

  const columns: Column<PublicAuthUser>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'USER',
        sortable: true,
        sortValue: (r) => r.name,
        render: (r) => (
          <div className="flex items-center gap-2.5">
            <UserAvatar name={r.name} initials={r.avatarInitials} src={r.avatarUrl} size="sm" />
            <div>
              <div className="font-semibold text-[#E8ECEF]">
                {r.name}
                {me?.id === r.id && (
                  <span className="ml-1.5 rounded bg-[#1A2A28] px-1 py-0.5 text-[9px] font-semibold text-[#3AC7A3]">
                    YOU
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#6A737C]">{r.email}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'ROLE',
        sortable: true,
        sortValue: (r) => r.roleLabel,
        render: (r) => r.roleLabel,
      },
      { key: 'site', header: 'SITE', render: (r) => r.site },
      {
        key: 'st',
        header: 'STATUS',
        render: (r) => <StatusBadge value={r.status ?? 'Active'} />,
      },
      {
        key: 'login',
        header: 'LAST LOGIN',
        render: (r) => (
          <span className="text-[#6A737C]">{r.lastLogin ?? '—'}</span>
        ),
      },
      {
        key: 'act',
        header: '',
        render: (r) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(r);
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    [me?.id],
  );

  return (
    <PageShell
      title="USER MANAGEMENT"
      subtitle="Accounts · display names · profile photos · site access"
      actions={
        <Button
          variant="primary"
          size="sm"
          leftIcon={<UserPlus className="h-3.5 w-3.5" />}
          onClick={() =>
            pushToast({
              tone: 'info',
              title: 'Invite user',
              message: 'Provisioning flow hooks to identity provider later.',
            })
          }
        >
          Invite user
        </Button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="USERS" value={users.length} tone="cyan" />
        <StatTile
          label="ACTIVE NOW"
          value={users.filter((u) => (u.status ?? 'Active') === 'Active').length}
          tone="green"
        />
        <StatTile
          label="IDLE"
          value={users.filter((u) => u.status === 'Idle').length}
          tone="amber"
        />
        <StatTile
          label="WITH PHOTO"
          value={users.filter((u) => !!u.avatarUrl).length}
          tone="cyan"
        />
      </div>

      <DataTable
        rows={users}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search name, email, role…"
        searchFn={(r, q) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.roleLabel.toLowerCase().includes(q)
        }
        onRowClick={(r) => setEditing(r)}
      />

      {editing && (
        <ProfileEditorModal
          user={editing}
          title={`Edit user · ${editing.name}`}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateProfile(editing.id, patch);
            pushToast({
              tone: 'success',
              title: 'User updated',
              message: `${patch.name ?? editing.name} profile saved locally.`,
            });
            setEditing(null);
          }}
        />
      )}
    </PageShell>
  );
}
