/**
 * Anomaly model — deterministic, tunable scoring against an entity's signals.
 *
 * Each signal is a named feature that maps an entity (and its event/relationship
 * context) to a 0-100 value. The model is a linear combo with per-signal weights
 * and a global threshold; anything ≥ threshold is flagged.
 *
 * In production this layer is replaced with a server-issued model spec, but the
 * UI tuning surface stays identical.
 */

/**
 * @typedef {Object} SignalDef
 * @property {string} key
 * @property {string} label
 * @property {string} description
 * @property {number} defaultWeight   0–1
 * @property {(ctx: SignalCtx) => number} score   returns 0–100
 *
 * @typedef {Object} SignalCtx
 * @property {import('@/types').Entity} entity
 * @property {{ kind: string }[]} [edges]
 * @property {import('@/types').EventRecord[]} [events]
 *
 * @typedef {Object} ModelConfig
 * @property {string} id
 * @property {string} name
 * @property {Record<string, number>} weights
 * @property {number} threshold
 * @property {number} updatedAt
 */

/** @type {SignalDef[]} */
export const SIGNALS = [
  {
    key: 'sanctions_match',
    label: 'Sanctions match',
    description: 'Entity tagged as sanctioned or PEP.',
    defaultWeight: 1.0,
    score: ({ entity }) => {
      const tags = entity.tags || [];
      let s = 0;
      if (tags.includes('sanctioned')) s = 100;
      else if (tags.includes('pep')) s = 60;
      return s;
    },
  },
  {
    key: 'high_risk_jurisdiction',
    label: 'High-risk jurisdiction',
    description: 'Entity registered in a known high-risk country.',
    defaultWeight: 0.6,
    score: ({ entity }) => {
      const HIGH = new Set(['RU', 'CY', 'PA', 'KY', 'NG']);
      return HIGH.has(entity.country) ? 80 : 0;
    },
  },
  {
    key: 'shell_company_signal',
    label: 'Shell company signal',
    description: 'Entity matches shell-company patterns.',
    defaultWeight: 0.8,
    score: ({ entity }) => ((entity.tags || []).includes('shell-company') ? 90 : 0),
  },
  {
    key: 'mule_pattern',
    label: 'Mule pattern',
    description: 'Multiple inbound + single outbound, recent.',
    defaultWeight: 0.7,
    score: ({ entity }) => ((entity.tags || []).includes('mule-suspected') ? 85 : 0),
  },
  {
    key: 'velocity',
    label: 'Transaction velocity',
    description: 'Rate of recent transactions vs. baseline.',
    defaultWeight: 0.5,
    score: ({ entity }) => {
      // Synthetic — proportional to risk; in real systems comes from event aggregations
      const r = entity.riskScore ?? 0;
      return Math.min(100, r * 0.7);
    },
  },
  {
    key: 'crypto_linked',
    label: 'Crypto on-ramp linkage',
    description: 'Linked to known crypto on-ramp accounts.',
    defaultWeight: 0.4,
    score: ({ entity }) => ((entity.tags || []).includes('crypto-linked') ? 75 : 0),
  },
];

/** @returns {ModelConfig} */
export const defaultConfig = () => ({
  id: 'default',
  name: 'Default v2.4',
  weights: Object.fromEntries(SIGNALS.map((s) => [s.key, s.defaultWeight])),
  threshold: 55,
  updatedAt: Date.now(),
});

/**
 * Score one entity. Returns the 0–100 composite, plus a per-signal breakdown.
 * @param {SignalCtx} ctx
 * @param {ModelConfig} cfg
 */
export function scoreEntity(ctx, cfg) {
  const breakdown = {};
  let sum = 0;
  let denom = 0;
  for (const s of SIGNALS) {
    const w = cfg.weights[s.key] ?? 0;
    if (w <= 0) {
      breakdown[s.key] = 0;
      continue;
    }
    const raw = s.score(ctx);
    breakdown[s.key] = raw;
    sum += raw * w;
    denom += w;
  }
  const composite = denom > 0 ? sum / denom : 0;
  return { composite, breakdown, flagged: composite >= cfg.threshold };
}
