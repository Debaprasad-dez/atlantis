import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tile, RiskBar } from '@/components/primitives';
import { useLiveStore } from '@/stores/liveStore';
import { useDexie } from '@/hooks/useDexie';
import { useRefreshable } from '@/hooks/useRefreshable';
import { db } from '@/db/schema';
import { fmtRelative } from '@/lib/format';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/stores/toastStore';

const SEV_COLOR = {
  low: 'text-text-secondary',
  medium: 'text-accent-warning',
  high: 'text-accent-warning',
  critical: 'text-accent-critical',
};

export function AnomalyScoreTile({ span }) {
  const live = useLiveStore((s) => s.anomalies);
  const [tick, refresh] = useRefreshable();
  const navigate = useNavigate();
  const { data: stored, loading } = useDexie(
    async () => db.anomalies.orderBy('detectedAt').reverse().limit(40).toArray(),
    [tick],
  );
  const list = useMemo(() => {
    const merged = [...live, ...(stored ?? [])];
    const seen = new Set();
    return merged.filter((a) => (seen.has(a.id) ? false : seen.add(a.id))).slice(0, 30);
  }, [live, stored]);

  return (
    <Tile
      title="ANOMALIES"
      live
      loading={loading}
      span={span}
      footer={`${list.length} active · click row to inspect entity`}
      onRefresh={() => { refresh(); toast.info('Reloaded anomalies'); }}
      onExpand={() => navigate('/anomalies')}
      onCopy={async () => {
        const ok = await copyText(JSON.stringify(list, null, 2));
        ok ? toast.success(`Copied ${list.length} anomalies`) : toast.warning('Copy failed');
      }}
      onConfigure={() => navigate('/anomalies?tab=tune')}
    >
      <ul className="h-full overflow-auto">
        {list.map((a) => (
          <li
            key={a.id}
            onClick={() => navigate(`/entities?focus=${a.entityId}`)}
            className="px-2 py-1 border-b border-border-subtle/50 hover:bg-bg-hover cursor-pointer"
            title="Open entity in Explorer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`section-label ${SEV_COLOR[a.severity]}`}>{a.severity}</span>
              <span className="tabular text-micro text-text-muted">{fmtRelative(a.detectedAt)}</span>
            </div>
            <div className="text-xs text-text-primary truncate">{a.reason}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="tabular text-micro text-text-faint w-20 truncate">{a.entityId}</span>
              <RiskBar score={a.score} className="flex-1" showValue={false} />
              <span className="tabular text-micro text-text-secondary w-6 text-right">{a.score}</span>
            </div>
          </li>
        ))}
        {list.length === 0 && (
          <li className="px-2 py-4 text-center text-micro text-text-muted">
            No anomalies detected.
          </li>
        )}
      </ul>
    </Tile>
  );
}
