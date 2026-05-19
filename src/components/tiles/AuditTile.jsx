import { useNavigate } from 'react-router-dom';
import { Tile } from '@/components/primitives';
import { useDexie } from '@/hooks/useDexie';
import { useRefreshable } from '@/hooks/useRefreshable';
import { db } from '@/db/schema';
import { fmtTime } from '@/lib/format';
import { toast } from '@/stores/toastStore';

export function AuditTile({ span }) {
  const [tick, refresh] = useRefreshable();
  const navigate = useNavigate();
  const { data, loading } = useDexie(
    async () => db.audit.orderBy('ts').reverse().limit(60).toArray(),
    [tick],
  );
  const list = data ?? [];
  return (
    <Tile
      title="RECENT AUDIT"
      span={span}
      loading={loading}
      footer={`${list.length} latest · click row to deep-link`}
      onRefresh={() => { refresh(); toast.info('Refreshed audit'); }}
      onExpand={() => navigate('/audit')}
    >
      <ul className="h-full overflow-auto">
        {list.map((a) => (
          <li
            key={a.id}
            onClick={() => navigate(`/audit?focus=${a.id}`)}
            className="flex items-center gap-2 px-2 h-5 text-xs border-b border-border-subtle/40 hover:bg-bg-hover cursor-pointer"
          >
            <span className="tabular text-micro text-text-muted w-14 flex-shrink-0">{fmtTime(a.ts)}</span>
            <span className="section-label text-viz-violet w-20 flex-shrink-0 truncate">{a.action}</span>
            <span className="text-text-secondary flex-1 truncate">{a.target || '—'}</span>
            <span className="tabular text-micro text-text-faint w-20 text-right truncate flex-shrink-0">{a.userId}</span>
          </li>
        ))}
        {list.length === 0 ? (
          <li className="px-2 py-4 text-center text-micro text-text-muted">No audit entries yet.</li>
        ) : null}
      </ul>
    </Tile>
  );
}
