import { useEffect, useState } from 'react';
import { db } from '@/db/schema';
import { BUILTIN_ROLES } from '@/lib/rbac';

/**
 * Loads roles from Dexie. Falls back to BUILTIN_ROLES when the table is empty.
 *
 * Previously polled every 3s, which leaked a timer between tests and OOM'd the
 * Vitest worker pool. Now refreshes only when `refreshKey` changes — callers
 * that mutate roles (e.g. Admin) bump the key to re-read.
 *
 * @param {number} [refreshKey]
 * @returns {import('@/types').Role[]}
 */
export function useRoles(refreshKey = 0) {
  const [roles, setRoles] = useState(BUILTIN_ROLES);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await db.roles.toArray();
      if (!cancelled) setRoles(r.length ? r : BUILTIN_ROLES);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);
  return roles;
}
