import { useEffect, useState } from 'react';
import { db } from '@/db/schema';
import { compileQuery } from '@/lib/query';

/**
 * Run a compiled query against the entities store. Streams matches up to `limit`,
 * favoring highest-risk entities first.
 *
 * @param {string} queryString
 * @param {{ limit?: number }} [opts]
 * @returns {{ rows: import('@/types').Entity[], loading: boolean, errors: string[] }}
 */
export function useQueryEntities(queryString, opts = {}) {
  const limit = opts.limit ?? 1000;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { predicate, errors: parseErrors } = compileQuery(queryString || '');
    setErrors(parseErrors);
    (async () => {
      const out = [];
      await db.entities
        .orderBy('riskScore')
        .reverse()
        .until(() => out.length >= limit)
        .each((e) => {
          if (predicate(e)) out.push(e);
        });
      if (!cancelled) {
        setRows(out);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryString, limit]);

  return { rows, loading, errors };
}
