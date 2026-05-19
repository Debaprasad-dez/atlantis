/**
 * ULID-ish id generator. Lexicographically sortable, time-prefixed.
 * Good enough for seed/demo; not cryptographically random.
 * @returns {string}
 */
export function ulid() {
  const t = Date.now().toString(36).padStart(9, '0');
  const r = Math.random().toString(36).slice(2, 12).padStart(10, '0');
  return (t + r).toUpperCase();
}

/**
 * Stable short id from a seed integer (used by seed worker for determinism).
 * @param {string} prefix
 * @param {number} n
 * @returns {string}
 */
export function seq(prefix, n) {
  return `${prefix}${n.toString(36).toUpperCase().padStart(8, '0')}`;
}
