import { create } from 'zustand';

const MAX_FEED = 200;
const MAX_SPARK = 60;

/**
 * Live tick state — feeds the dashboard's "alive" feeling.
 * Hydrated by useLiveTick() which owns the worker.
 *
 * @typedef {import('@/types').EventRecord} EventRecord
 * @typedef {import('@/types').Anomaly} Anomaly
 */
export const useLiveStore = create((set) => ({
  /** @type {EventRecord[]} */
  feed: [],
  /** @type {Anomaly[]} */
  anomalies: [],
  metrics: {
    sysLoad: 24,
    queryLatency: 41,
    ingestRate: 0,
    totalIngested: 0,
    alertsPending: 0,
  },
  /** Rolling spark series. */
  sparks: {
    ingest: Array(MAX_SPARK).fill(0),
    latency: Array(MAX_SPARK).fill(40),
    load: Array(MAX_SPARK).fill(20),
    alerts: Array(MAX_SPARK).fill(0),
  },

  /** When true, new ticks update metrics/sparks but the visible feed array stops growing. */
  paused: false,
  togglePaused: () => set((s) => ({ paused: !s.paused })),

  pushTick: (events, anomaly, metrics) =>
    set((s) => {
      const nextFeed = s.paused ? s.feed : [...events.slice().reverse(), ...s.feed].slice(0, MAX_FEED);
      const nextAnoms = anomaly ? [anomaly, ...s.anomalies].slice(0, 80) : s.anomalies;
      const critCount = events.filter((e) => e.severity === 'critical').length;
      const nextMetrics = {
        ...metrics,
        totalIngested: s.metrics.totalIngested + events.length,
        alertsPending: s.metrics.alertsPending + critCount + (anomaly ? 1 : 0),
      };
      const push = (arr, v) => [...arr.slice(1), v];
      return {
        feed: nextFeed,
        anomalies: nextAnoms,
        metrics: nextMetrics,
        sparks: {
          ingest: push(s.sparks.ingest, metrics.ingestRate),
          latency: push(s.sparks.latency, metrics.queryLatency),
          load: push(s.sparks.load, metrics.sysLoad),
          alerts: push(s.sparks.alerts, critCount + (anomaly ? 1 : 0)),
        },
      };
    }),

  acknowledgeAlerts: () =>
    set((s) => ({ metrics: { ...s.metrics, alertsPending: 0 } })),
}));
