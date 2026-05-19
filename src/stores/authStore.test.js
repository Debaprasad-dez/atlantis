import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('STORE-AU-01: initial user is null', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('STORE-AU-02: login sets the user', () => {
    useAuthStore.getState().login({ id: 'u', name: 'X', email: 'x', roleId: 'r', createdAt: 0 });
    expect(useAuthStore.getState().user?.name).toBe('X');
  });

  it('STORE-AU-03: logout clears the user', () => {
    useAuthStore.getState().login({ id: 'u', name: 'X', email: 'x', roleId: 'r', createdAt: 0 });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('STORE-AU-04: persists to localStorage under atlantis.auth', () => {
    useAuthStore.getState().login({ id: 'u', name: 'X', email: 'x', roleId: 'r', createdAt: 0 });
    const raw = localStorage.getItem('atlantis.auth');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw).state.user.name).toBe('X');
  });
});
