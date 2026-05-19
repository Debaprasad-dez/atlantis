import { useEffect, useState } from 'react';
import { db } from '@/db/schema';

/**
 * Owns the seed worker lifecycle. Returns progress state suitable for a boot splash.
 *
 * @returns {{ ready: boolean, stage: string, done: number, total: number, error: string|null }}
 */
export function useSeed() {
  const [state, setState] = useState({
    ready: false,
    stage: 'init',
    done: 0,
    total: 0,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let worker;

    (async () => {
      const already = await db.meta.get('seeded');
      if (already?.value) {
        if (!cancelled) setState((s) => ({ ...s, ready: true, stage: 'ready' }));
        return;
      }
      worker = new Worker(new URL('@/workers/seed.worker.js', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (e) => {
        const m = e.data;
        if (cancelled) return;
        if (m.type === 'progress') {
          setState((s) => ({ ...s, stage: m.stage, done: m.done, total: m.total }));
        } else if (m.type === 'done') {
          setState((s) => ({ ...s, ready: true, stage: 'ready' }));
        } else if (m.type === 'error') {
          setState((s) => ({ ...s, error: m.message }));
        }
      };
      worker.postMessage({ type: 'seed' });
    })();

    return () => {
      cancelled = true;
      worker?.terminate();
    };
  }, []);

  return state;
}
