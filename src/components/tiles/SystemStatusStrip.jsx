import { useLiveStore } from '@/stores/liveStore';
import { useEntityCount } from '@/hooks/useEntities';
import { MetricCard } from '@/components/primitives';
import { fmtCompact } from '@/lib/format';

/**
 * Full-width strip of KPI cards at the top of the dashboard.
 * Each card has a sparkline and live deltas from the tick worker.
 */
export function SystemStatusStrip() {
  const sparks = useLiveStore((s) => s.sparks);
  const metrics = useLiveStore((s) => s.metrics);
  const totalEntities = useEntityCount();

  return (
    <div className="grid grid-cols-5 border border-border-subtle bg-bg-panel divide-x divide-border-subtle h-14">
      <MetricCard
        label="RECORDS"
        value={fmtCompact(totalEntities + metrics.totalIngested)}
        delta={+1.2}
        spark={sparks.ingest}
      />
      <MetricCard
        label="INGEST RATE"
        value={metrics.ingestRate}
        unit="ev/s"
        delta={+0.6}
        spark={sparks.ingest}
      />
      <MetricCard
        label="Q-LATENCY"
        value={metrics.queryLatency}
        unit="ms"
        delta={-3.4}
        spark={sparks.latency}
        tone="amber"
      />
      <MetricCard
        label="SYSTEM LOAD"
        value={`${metrics.sysLoad}%`}
        delta={+0.8}
        spark={sparks.load}
        tone="amber"
      />
      <MetricCard
        label="ALERTS PENDING"
        value={fmtCompact(metrics.alertsPending)}
        delta={metrics.alertsPending > 0 ? +12.4 : 0}
        spark={sparks.alerts}
        tone="critical"
      />
    </div>
  );
}
