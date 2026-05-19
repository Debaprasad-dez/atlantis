import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGraphData } from './useGraphData';
import { db } from '@/db/schema';

beforeEach(async () => {
  await db.entities.bulkPut([
    { id: 'E1', type: 'person', name: 'A', riskScore: 90, tags: [], country: 'US', attrs: {}, createdAt: 0, updatedAt: 0 },
    { id: 'E2', type: 'person', name: 'B', riskScore: 20, tags: [], country: 'US', attrs: {}, createdAt: 0, updatedAt: 0 },
    { id: 'E3', type: 'account', name: 'C', riskScore: 70, tags: [], country: 'US', attrs: {}, createdAt: 0, updatedAt: 0 },
  ]);
  await db.relationships.bulkPut([
    { id: 'R1', sourceId: 'E1', targetId: 'E2', kind: 'transacts_with', weight: 0.5, firstSeen: 100, lastSeen: 200 },
    { id: 'R2', sourceId: 'E1', targetId: 'E3', kind: 'owns', weight: 1, firstSeen: 100, lastSeen: 200 },
    { id: 'R3', sourceId: 'E2', targetId: 'E3', kind: 'controls', weight: 0.8, firstSeen: 300, lastSeen: 400 },
  ]);
});

describe('useGraphData', () => {
  it('GRAPH-01: returns all nodes + edges by default', async () => {
    const { result } = renderHook(() => useGraphData({ maxEdges: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.links).toHaveLength(3);
    expect(result.current.nodes).toHaveLength(3);
  });

  it('GRAPH-02: filters edges by kind', async () => {
    const { result } = renderHook(() => useGraphData({ kinds: ['owns'], maxEdges: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.links).toHaveLength(1);
    expect(result.current.links[0].kind).toBe('owns');
  });

  it('GRAPH-03: minRisk filters nodes and their edges', async () => {
    const { result } = renderHook(() => useGraphData({ minRisk: 50, maxEdges: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // E2 (risk 20) dropped — edges touching it are also gone
    const ids = new Set(result.current.nodes.map((n) => n.id));
    expect(ids.has('E2')).toBe(false);
    expect(ids.has('E1')).toBe(true);
    expect(ids.has('E3')).toBe(true);
  });

  it('GRAPH-04: time scrubber drops edges first-seen after cutoff', async () => {
    const { result } = renderHook(() => useGraphData({ beforeTs: 200, maxEdges: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // R3 firstSeen=300 should be excluded
    expect(result.current.links.every((l) => l.firstSeen <= 200)).toBe(true);
  });
});
