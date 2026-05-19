import { Tile, StatusIndicator } from '@/components/primitives';
import { useDexie } from '@/hooks/useDexie';
import { useRefreshable } from '@/hooks/useRefreshable';
import { db } from '@/db/schema';
import { fmtCompact, fmtRelative } from '@/lib/format';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';

export function DataSourceHealthTile({ span }) {
  const [tick, refresh] = useRefreshable();
  const user = useAuthStore((s) => s.user);
  const { data, loading } = useDexie(async () => db.sources.toArray(), [tick]);
  const list = data ?? [];

  const syncAll = async () => {
    const now = Date.now();
    await Promise.all(
      list.map((s) =>
        db.sources.update(s.id, {
          lastSync: now,
          // bump a few thousand records for visible feedback
          recordCount: s.recordCount + Math.floor(Math.random() * 500),
          status: s.status === 'offline' ? 'degraded' : 'healthy',
        }),
      ),
    );
    audit(user?.id, 'sync_sources', null, { count: list.length });
    refresh();
    toast.success(`Synced ${list.length} sources`);
  };

  const toggleSourceStatus = async (s) => {
    const next = s.status === 'healthy' ? 'degraded' : s.status === 'degraded' ? 'offline' : 'healthy';
    await db.sources.update(s.id, { status: next });
    audit(user?.id, 'update_source', s.id, { status: next });
    refresh();
  };

  return (
    <Tile
      title="DATA SOURCES"
      span={span}
      loading={loading}
      footer={`${list.length} sources · click a dot to cycle status`}
      onRefresh={() => { refresh(); toast.info('Reloaded sources'); }}
      menuItems={[
        { key: 'sync', label: 'Sync all now', icon: '↻', onSelect: syncAll },
        { key: 'refresh', label: 'Reload tile', icon: '⟳', onSelect: refresh },
      ]}
    >
      <ul className="h-full overflow-auto">
        {list.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-2 px-2 py-1 border-b border-border-subtle/50 hover:bg-bg-hover"
          >
            <button
              type="button"
              onClick={() => toggleSourceStatus(s)}
              title="Cycle status (debug)"
              className="cursor-pointer"
            >
              <StatusIndicator status={s.status} />
            </button>
            <span className="text-xs text-text-primary flex-1 truncate">{s.name}</span>
            <span className="tabular text-micro text-text-secondary w-14 text-right">
              {fmtCompact(s.recordCount)}
            </span>
            <span className="tabular text-micro text-text-muted w-20 text-right">
              {fmtRelative(s.lastSync)}
            </span>
          </li>
        ))}
      </ul>
    </Tile>
  );
}
