import { useEffect } from 'react';
import { useLiveStore } from '@/stores/liveStore';
import { db } from '@/db/schema';

/**
 * Boots the tick worker and pipes its emissions into the live store + Dexie.
 * Call once at the app root.
 */
export function useLiveTick(enabled = true) {
  const pushTick = useLiveStore((s) => s.pushTick);

  useEffect(() => {
    if (!enabled) return undefined;
    const worker = new Worker(new URL('@/workers/tick.worker.js', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = async (e) => {
      const m = e.data;
      if (m?.type !== 'tick') return;
      pushTick(m.events, m.anomaly, m.metrics);
      // Persist in background — don't await.
      db.events.bulkPut(m.events).catch(() => {});
      if (m.anomaly) db.anomalies.put(m.anomaly).catch(() => {});
    };
    worker.postMessage({ type: 'start' });
    return () => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
    };
  }, [enabled, pushTick]);
}
