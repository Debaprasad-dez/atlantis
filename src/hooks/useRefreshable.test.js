import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRefreshable } from './useRefreshable';

describe('useRefreshable', () => {
  it('REFR-01: initial value is 0', () => {
    const { result } = renderHook(() => useRefreshable());
    expect(result.current[0]).toBe(0);
  });

  it('REFR-02: refresh increments the key', () => {
    const { result } = renderHook(() => useRefreshable());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(1);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(2);
  });
});
