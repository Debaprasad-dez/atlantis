import { useEffect, useState } from 'react';
import { db } from '@/db/schema';

/**
 * Fetch entities matching a filter spec. Returns the array + a loading flag.
 *
 * @param {Object} filter
 * @param {string[]} [filter.types]
 * @param {string[]} [filter.countries]
 * @param {string[]} [filter.tags]
 * @param {[number, number]} [filter.riskRange]
 * @param {string} [filter.search]
 * @param {number} [filter.limit]
 */
export function useEntities(filter = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(filter);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let coll = db.entities.orderBy('riskScore').reverse();
      const search = filter.search?.toLowerCase().trim();
      const r = filter.riskRange;
      const out = [];
      const limit = filter.limit ?? 500;
      await coll.until(() => out.length >= limit).each((e) => {
        if (filter.types?.length && !filter.types.includes(e.type)) return;
        if (filter.countries?.length && !filter.countries.includes(e.country)) return;
        if (filter.tags?.length && !filter.tags.some((t) => e.tags?.includes(t))) return;
        if (r && (e.riskScore < r[0] || e.riskScore > r[1])) return;
        if (search && !e.name.toLowerCase().includes(search) && !e.id.toLowerCase().includes(search))
          return;
        out.push(e);
      });
      if (!cancelled) {
        setRows(out);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { rows, loading };
}

/** Total entity count (cheap — uses Dexie .count). */
export function useEntityCount(type) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const q = type ? db.entities.where('type').equals(type) : db.entities;
    q.count().then((c) => !cancelled && setN(c));
    return () => {
      cancelled = true;
    };
  }, [type]);
  return n;
}
