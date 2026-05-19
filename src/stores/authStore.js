import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @typedef {import('@/types').User} User
 * @typedef {{ user: User|null, login: (u: User) => void, logout: () => void }} AuthState
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<AuthState>>} */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      // Reserved for future backend integration — populated after server-side auth
      // exchange. While offline this stays null and api() falls back to repos.
      token: null,
      login: (user, token = null) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      setToken: (token) => set({ token }),
    }),
    { name: 'atlantis.auth' },
  ),
);
