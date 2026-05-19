import { create } from 'zustand';

/**
 * Transient notifications. Toasts auto-dismiss after `ttl` ms.
 *
 * @typedef {{ id: number, kind: 'info'|'success'|'warning'|'critical', message: string, ttl: number }} Toast
 */

let _id = 1;

export const useToastStore = create((set, get) => ({
  /** @type {Toast[]} */
  toasts: [],
  push: (kind, message, ttl = 3200) => {
    const id = _id++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message, ttl }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, ttl);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience wrappers. */
export const toast = {
  info: (msg) => useToastStore.getState().push('info', msg),
  success: (msg) => useToastStore.getState().push('success', msg),
  warning: (msg) => useToastStore.getState().push('warning', msg),
  critical: (msg) => useToastStore.getState().push('critical', msg),
};
