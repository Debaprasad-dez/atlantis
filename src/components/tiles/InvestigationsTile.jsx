import { useNavigate } from 'react-router-dom';
import { Tile } from '@/components/primitives';
import { useDexie } from '@/hooks/useDexie';
import { useRefreshable } from '@/hooks/useRefreshable';
import { db } from '@/db/schema';
import { fmtRelative } from '@/lib/format';
import { ulid } from '@/lib/ids';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';

const STATUS_TONE = {
  open: 'text-accent-primary border-accent-primary/40 bg-accent-primary/5',
  reviewing: 'text-accent-warning border-accent-warning/40 bg-accent-warning/5',
  closed: 'text-text-muted border-border-subtle bg-bg-elevated',
};

export function InvestigationsTile({ span }) {
  const [tick, refresh] = useRefreshable();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data, loading } = useDexie(
    async () => db.investigations.orderBy('updatedAt').reverse().limit(20).toArray(),
    [tick],
  );
  const list = data ?? [];

  const newCase = async () => {
    const title = prompt('Case title:');
    if (!title) return;
    const id = ulid();
    await db.investigations.put({
      id,
      title,
      status: 'open',
      ownerId: user?.id ?? 'system',
      entityIds: [],
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    audit(user?.id, 'open_case', id, { title });
    toast.success(`Created “${title}”`);
    refresh();
    navigate(`/investigations/${id}`);
  };

  return (
    <Tile
      title="ACTIVE INVESTIGATIONS"
      span={span}
      loading={loading}
      footer={`${list.length} cases · click to open`}
      onRefresh={() => { refresh(); toast.info('Refreshed cases'); }}
      onExpand={() => navigate('/investigations')}
      menuItems={[
        { key: 'new', label: 'New case…', icon: '+', onSelect: newCase },
        { key: 'refresh', label: 'Refresh', icon: '↻', onSelect: refresh },
        { key: 'open', label: 'Open all cases →', icon: '↗', onSelect: () => navigate('/investigations') },
      ]}
    >
      <ul className="h-full overflow-auto divide-y divide-border-subtle/50">
        {list.map((i) => (
          <li
            key={i.id}
            onClick={() => navigate(`/investigations/${i.id}`)}
            className="px-2 py-1.5 hover:bg-bg-hover cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className={`chip ${STATUS_TONE[i.status]} border`}>{i.status}</span>
              <span className="text-xs text-text-primary truncate flex-1">{i.title}</span>
              <span className="tabular text-micro text-text-muted">{fmtRelative(i.updatedAt)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1 bg-bg-base border border-border-subtle overflow-hidden">
                <div className="h-full bg-accent-primary/70" style={{ width: `${i.progress}%` }} />
              </div>
              <span className="tabular text-micro text-text-secondary w-8 text-right">{i.progress}%</span>
            </div>
          </li>
        ))}
      </ul>
    </Tile>
  );
}
