/**
 * Formatters tuned for dense, tabular displays.
 */

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** @param {number} n */
export const fmtInt = (n) => nf0.format(n ?? 0);

/** @param {number} n */
export const fmtCompact = (n) => compact.format(n ?? 0);

/**
 * @param {number} n
 * @param {string} [ccy]
 */
export const fmtMoney = (n, ccy = 'USD') =>
  `${ccy === 'USD' ? '$' : ''}${nf2.format(n ?? 0)}${ccy === 'USD' ? '' : ' ' + ccy}`;

/** @param {number} ts epoch ms */
export const fmtTime = (ts) => {
  const d = new Date(ts);
  return d.toISOString().slice(11, 19);
};

/** @param {number} ts epoch ms */
export const fmtDateTime = (ts) => {
  const d = new Date(ts);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

/** @param {number} ts epoch ms */
export const fmtRelative = (ts) => {
  const diff = Date.now() - ts;
  if (diff < 0) return 'in future';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

/** @param {number} n */
export const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;
