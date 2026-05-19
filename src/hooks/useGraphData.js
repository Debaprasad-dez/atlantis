import { useEffect, useState } from 'react';
import { db } from '@/db/schema';

/**
 * Pull a relationship subgraph from Dexie. By default takes the highest-weight edges.
 *
 * @param {Object} opts
 * @param {string[]} [opts.kinds]     allowed relationship kinds
 * @param {number}   [opts.maxEdges]  total edges fetched
 * @param {number}   [opts.minRisk]   filter to nodes with risk >= this
 * @param {number}   [opts.beforeTs]  only edges with firstSeen <= this (time scrubber)
 * @returns {{ nodes: any[], links: any[], loading: boolean }}
 */
export function useGraphData(opts = {}) {
  const { kinds, maxEdges = 200, minRisk = 0, beforeTs } = opts;
  const [state, setState] = useState({ nodes: [], links: [], loading: true });
  const key = JSON.stringify({ kinds, maxEdges, minRisk, beforeTs });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      let coll = db.relationships.orderBy('lastSeen').reverse();
      const rels = [];
      await coll.until(() => rels.length >= maxEdges).each((r) => {
        if (kinds && kinds.length && !kinds.includes(r.kind)) return;
        if (beforeTs != null && r.firstSeen > beforeTs) return;
        rels.push(r);
      });
      const ids = new Set();
      rels.forEach((r) => {
        ids.add(r.sourceId);
        ids.add(r.targetId);
      });
      const ents = await db.entities.where('id').anyOf([...ids]).toArray();
      const byId = new Map(ents.map((e) => [e.id, e]));

      const filteredNodes = ents.filter((e) => (e.riskScore ?? 0) >= minRisk);
      const okIds = new Set(filteredNodes.map((e) => e.id));
      const filteredEdges = rels.filter((r) => okIds.has(r.sourceId) && okIds.has(r.targetId));

      const nodes = filteredNodes.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        risk: e.riskScore,
        country: e.country,
      }));
      const links = filteredEdges.map((r) => ({
        source: r.sourceId,
        target: r.targetId,
        kind: r.kind,
        weight: r.weight,
        firstSeen: r.firstSeen,
        lastSeen: r.lastSeen,
      }));
      if (!cancelled) setState({ nodes, links, loading: false, byId });
    })();
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
