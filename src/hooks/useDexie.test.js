import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDexie } from './useDexie';

describe('useDexie', () => {
  it('HOOK-DX-01: resolves data and clears loading', async () => {
    const { result } = renderHook(() => useDexie(async () => [1, 2, 3], []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2, 3]);
    expect(result.current.error).toBeNull();
  });

  it('HOOK-DX-02: surfaces errors', async () => {
    const { result } = renderHook(() =>
      useDexie(async () => {
        throw new Error('boom');
      }, []),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.data).toBeNull();
  });

  it('HOOK-DX-03: re-runs on deps change', async () => {
    const fn = vi.fn(async () => 1);
    const { rerender, result } = renderHook(({ k }) => useDexie(fn, [k]), {
      initialProps: { k: 'a' },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ k: 'b' });
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
  });
});
