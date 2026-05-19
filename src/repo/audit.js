/**
 * Audit repository with hash-chained tamper-evidence.
 *
 *   Future API:  GET  /api/v1/audit?since=ts&until=ts
 *                POST /api/v1/audit         (server-issued chain)
 *
 * Hash chain invariant:
 *   entry.hash = sha256( prevHash || entry.userId || entry.action || entry.ts
 *                        || JSON.stringify(target) || JSON.stringify(details) )
 *
 * The "hash" column is unique to Phase 3. Older rows that pre-date the chain
 * (Phase 1/2) verify as "unchained" — not tampered, just legacy.
 */
import { db } from '@/db/schema';
import { tryRemoteThenLocal } from './base';
import { api } from '@/lib/api';

const GENESIS = '0'.repeat(64);

/**
 * SHA-256 → lowercase hex.
 * Uses Web Crypto when available, falls back to a non-crypto hash for jsdom tests.
 * @param {string} text
 * @returns {Promise<string>}
 */
async function sha256Hex(text) {
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback — deterministic and stable across runs, NOT cryptographic.
  // Adequate for jsdom test verification because we test the chain structure, not the strength.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  return (hex(h1) + hex(h2)).padEnd(64, '0');
}

/** Build the canonical string fed into the hash. */
function entrySerialize(entry, prevHash) {
  return [
    prevHash,
    entry.userId ?? '',
    entry.action ?? '',
    String(entry.ts ?? 0),
    JSON.stringify(entry.target ?? null),
    JSON.stringify(entry.details ?? null),
  ].join('|');
}

/**
 * Append a new audit entry, hash-chained to the previous one.
 * Never throws — audit is fire-and-forget.
 *
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {string} opts.action
 * @param {string} [opts.target]
 * @param {Record<string, any>} [opts.details]
 */
export async function append({ userId, action, target, details }) {
  try {
    const ts = Date.now();
    const last = await db.audit.orderBy('id').reverse().first();
    const prevHash = last?.hash ?? GENESIS;
    const entry = { userId: userId || 'system', action, target, details, ts };
    entry.prevHash = prevHash;
    entry.hash = await sha256Hex(entrySerialize(entry, prevHash));
    await db.audit.add(entry);
  } catch {
    /* swallow */
  }
}

/**
 * Verify the chain from oldest to newest. Returns the first row whose hash
 * doesn't match the recomputation, or null if the chain is intact.
 *
 * Rows without a `hash` column (pre-Phase-3) are treated as "anchors": the
 * chain restarts at the next row that has a hash.
 *
 * @returns {Promise<{ verifiedRows: number, anchorRows: number, tampered: { id: number, action: string, ts: number }|null }>}
 */
export async function verifyChain() {
  const rows = await db.audit.orderBy('id').toArray();
  let verifiedRows = 0;
  let anchorRows = 0;
  let prevHash = GENESIS;
  let chainStarted = false;
  for (const r of rows) {
    if (!r.hash) {
      // Pre-chain entry. Reset the prev to genesis for the next chained entry.
      anchorRows++;
      prevHash = GENESIS;
      chainStarted = false;
      continue;
    }
    if (!chainStarted) {
      prevHash = r.prevHash ?? GENESIS;
      chainStarted = true;
    }
    const expected = await sha256Hex(entrySerialize(r, prevHash));
    if (expected !== r.hash) {
      return {
        verifiedRows,
        anchorRows,
        tampered: { id: r.id, action: r.action, ts: r.ts },
      };
    }
    verifiedRows++;
    prevHash = r.hash;
  }
  return { verifiedRows, anchorRows, tampered: null };
}

/**
 * @param {{ since?: number, until?: number, limit?: number }} [opts]
 */
export const list = (opts = {}) =>
  tryRemoteThenLocal(
    async () => {
      const all = await db.audit.orderBy('ts').reverse().limit(opts.limit ?? 5000).toArray();
      return all.filter(
        (a) =>
          (opts.since == null || a.ts >= opts.since) &&
          (opts.until == null || a.ts <= opts.until),
      );
    },
    () => api(`/api/v1/audit?${new URLSearchParams(opts)}`),
  );
