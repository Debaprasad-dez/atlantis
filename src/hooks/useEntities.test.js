import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEntities, useEntityCount } from './useEntities';
import { db } from '@/db/schema';

const mk = (id, type, risk, name = id, tags = [], country = 'US') => ({
  id, type, name, riskScore: risk, tags, country, attrs: {}, createdAt: 0, updatedAt: 0,
});

beforeEach(async () => {
  await db.entities.bulkPut([
    mk('E1', 'person', 10, 'Alice', ['kyc-verified']),
    mk('E2', 'person', 90, 'Bob', ['sanctioned'], 'RU'),
    mk('E3', 'account', 50, 'Acct-X'),
    mk('E4', 'organization', 70, 'Halcyon', ['shell-company'], 'KY'),
    mk('E5', 'person', 88, 'Carla', ['pep']),
  ]);
});

describe('useEntityCount', () => {
  it('HOOK-EN-01: total count', async () => {
    const { result } = renderHook(() => useEntityCount());
    await waitFor(() => expect(result.current).toBe(5));
  });
  it('HOOK-EN-02: by type', async () => {
    const { result } = renderHook(() => useEntityCount('person'));
    await waitFor(() => expect(result.current).toBe(3));
  });
});

describe('useEntities', () => {
  it('HOOK-EN-03: filters by type', async () => {
    const { result } = renderHook(() => useEntities({ types: ['account'], limit: 50 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows.map((r) => r.id)).toEqual(['E3']);
  });
  it('HOOK-EN-04: filters by risk range', async () => {
    const { result } = renderHook(() => useEntities({ riskRange: [80, 100], limit: 50 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows.map((r) => r.id).sort()).toEqual(['E2', 'E5']);
  });
  it('HOOK-EN-05: search matches name (case-insensitive)', async () => {
    const { result } = renderHook(() => useEntities({ search: 'hal', limit: 50 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows.map((r) => r.id)).toEqual(['E4']);
  });
  it('HOOK-EN-06: limit caps results', async () => {
    const { result } = renderHook(() => useEntities({ limit: 2 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows.length).toBeLessThanOrEqual(2);
  });
});
