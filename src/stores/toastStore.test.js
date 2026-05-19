import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore, toast } from './toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('TOAST-01: push adds a toast with the right kind', () => {
    toast.success('hi');
    const t = useToastStore.getState().toasts;
    expect(t).toHaveLength(1);
    expect(t[0].kind).toBe('success');
    expect(t[0].message).toBe('hi');
  });

  it('TOAST-02: auto-dismisses after ttl (real timer)', async () => {
    useToastStore.getState().push('info', 'x', 80);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    await new Promise((r) => setTimeout(r, 140));
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('TOAST-03: dismiss removes by id', () => {
    const id = useToastStore.getState().push('info', 'x', 999999);
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
