import { append } from '@/repo/audit';

/**
 * Append a hash-chained audit log entry. Fire-and-forget; never throws.
 *
 * Backwards-compatible with Phase 1/2 callers:
 *   audit(userId, action, target?, details?)
 *
 * @param {string} userId
 * @param {string} action
 * @param {string} [target]
 * @param {Record<string, any>} [details]
 */
export function audit(userId, action, target, details) {
  return append({ userId, action, target, details });
}
