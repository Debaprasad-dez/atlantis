import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSeed } from './useSeed';
import { db } from '@/db/schema';

describe('useSeed', () => {
  it('HOOK-SD-01: resolves to ready when meta.seeded is true', async () => {
    await db.meta.put({ key: 'seeded', value: true, at: 0 });
    const { result } = renderHook(() => useSeed());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.stage).toBe('ready');
  });
});
