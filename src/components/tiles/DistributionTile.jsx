import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tile } from '@/components/primitives';
import { useDexie } from '@/hooks/useDexie';
import { useRefreshable } from '@/hooks/useRefreshable';
import { db } from '@/db/schema';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/stores/toastStore';

/** Risk-score histogram. Click a bar to jump to Explorer filtered to that band. */
export function DistributionTile({ span }) {
  const [tick, refresh] = useRefreshable();
  const navigate = useNavigate();
  const { data, loading } = useDexie(async () => {
    const buckets = Array(10).fill(0);
    await db.entities.each((e) => {
      const b = Math.min(9, Math.floor(e.riskScore / 10));
      buckets[b]++;
    });
    return buckets;
  }, [tick]);

  const max = useMemo(() => Math.max(1, ...(data ?? [1])), [data]);

  const drillDown = (i) => {
    const low = i * 10;
    const high = Math.min(99, low + 9);
    navigate(`/entities?seedQuery=${encodeURIComponent(`risk:${low}..${high}`)}`);
  };

  return (
    <Tile
      title="RISK DISTRIBUTION"
      span={span}
      loading={loading}
      footer="Click a bar to drill in · risk 0-99 in 10-buckets"
      onRefresh={() => { refresh(); toast.info('Rebucketed'); }}
      onCopy={async () => {
        const ok = await copyText(JSON.stringify(data, null, 2));
        ok ? toast.success('Buckets copied') : toast.warning('Copy failed');
      }}
    >
      <div className="h-full p-2 flex items-end gap-1">
        {(data ?? Array(10).fill(0)).map((v, i) => {
          const h = (v / max) * 100;
          const tone =
            i >= 8 ? 'bg-accent-critical/80' : i >= 6 ? 'bg-accent-warning/80' : 'bg-accent-primary/70';
          return (
            <button
              key={i}
              type="button"
              onClick={() => drillDown(i)}
              className="flex-1 h-full flex flex-col justify-end items-center gap-1 group cursor-pointer"
              title={`Show entities with risk ${i * 10}–${i * 10 + 9}`}
            >
              <div className="tabular text-micro text-text-muted group-hover:text-text-primary">
                {v > 999 ? `${(v / 1000).toFixed(1)}k` : v}
              </div>
              <div className={`w-full ${tone} group-hover:opacity-100 opacity-90 transition-opacity`} style={{ height: `${h}%` }} />
              <div className="tabular text-micro text-text-faint">{i * 10}</div>
            </button>
          );
        })}
      </div>
    </Tile>
  );
}
