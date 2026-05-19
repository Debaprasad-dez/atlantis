import { describe, it, expect, beforeEach } from 'vitest';
import { useLiveStore } from './liveStore';

const ev = (id, severity = 'info') => ({
  id,
  kind: 'transaction',
  entityId: 'E1',
  ts: Date.now(),
  severity,
  description: '',
});
const metrics = { sysLoad: 10, queryLatency: 20, ingestRate: 3 };

describe('liveStore', () => {
  beforeEach(() => {
    useLiveStore.setState({
      feed: [],
      anomalies: [],
      metrics: { sysLoad: 0, queryLatency: 0, ingestRate: 0, totalIngested: 0, alertsPending: 0 },
      sparks: {
        ingest: Array(60).fill(0),
        latency: Array(60).fill(0),
        load: Array(60).fill(0),
        alerts: Array(60).fill(0),
      },
    });
  });

  it('STORE-LV-01/02: initial state', () => {
    const s = useLiveStore.getState();
    expect(s.feed).toEqual([]);
    for (const k of ['ingest', 'latency', 'load', 'alerts']) {
      expect(s.sparks[k]).toHaveLength(60);
    }
  });

  it('STORE-LV-03: pushTick prepends events newest first', () => {
    useLiveStore.getState().pushTick([ev('a'), ev('b'), ev('c')], null, metrics);
    expect(useLiveStore.getState().feed.map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('STORE-LV-04: feed capped at 200', () => {
    const batch = Array.from({ length: 250 }, (_, i) => ev('e' + i));
    useLiveStore.getState().pushTick(batch, null, metrics);
    expect(useLiveStore.getState().feed).toHaveLength(200);
  });

  it('STORE-LV-05: anomaly prepended and capped at 80', () => {
    for (let i = 0; i < 100; i++) {
      useLiveStore.getState().pushTick(
        [],
        { id: 'a' + i, entityId: 'E1', reason: '', score: 10, severity: 'low', detectedAt: 0 },
        metrics,
      );
    }
    expect(useLiveStore.getState().anomalies).toHaveLength(80);
    expect(useLiveStore.getState().anomalies[0].id).toBe('a99');
  });

  it('STORE-LV-06: totalIngested accumulates', () => {
    useLiveStore.getState().pushTick([ev('a'), ev('b')], null, metrics);
    useLiveStore.getState().pushTick([ev('c')], null, metrics);
    expect(useLiveStore.getState().metrics.totalIngested).toBe(3);
  });

  it('STORE-LV-07: critical events bump alertsPending', () => {
    useLiveStore.getState().pushTick([ev('a', 'critical'), ev('b', 'info')], null, metrics);
    expect(useLiveStore.getState().metrics.alertsPending).toBe(1);
  });

  it('STORE-LV-08: sparks roll, length stays 60', () => {
    useLiveStore.getState().pushTick([ev('a')], null, { ...metrics, ingestRate: 7 });
    const s = useLiveStore.getState().sparks;
    expect(s.ingest).toHaveLength(60);
    expect(s.ingest.at(-1)).toBe(7);
  });

  it('STORE-LV-09: acknowledgeAlerts resets to 0', () => {
    useLiveStore.getState().pushTick([ev('a', 'critical')], null, metrics);
    useLiveStore.getState().acknowledgeAlerts();
    expect(useLiveStore.getState().metrics.alertsPending).toBe(0);
  });
});
