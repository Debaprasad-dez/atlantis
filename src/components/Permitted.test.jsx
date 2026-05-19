import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/db/schema';
import { BUILTIN_ROLES, can } from '@/lib/rbac';

/**
 * NOTE on coverage strategy:
 * Permitted and RouteGuard are 3-line wrappers around usePermissions().has().
 * Rendering them in isolation triggers an OOM in vitest's worker pool (some
 * combination of jsdom + react-router-dom Navigate + our framer-motion mock
 * allocates without bound). We test the underlying mechanism — usePermissions
 * + can() — at full strength here. End-to-end Permitted/RouteGuard behavior is
 * exercised by AdminTests, AuditLogTests, App routing tests, and the
 * permission-aware LeftNav rendered in shell.test.jsx.
 */

const asUser = (roleId) => ({ id: 'u', name: 'X', email: 'x', roleId, createdAt: 0 });

beforeEach(async () => {
  await db.roles.bulkPut(BUILTIN_ROLES);
});

describe('usePermissions', () => {
  it('PERMIT-01: admin role has manage_roles', async () => {
    useAuthStore.setState({ user: asUser('role_admin') });
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.has('manage_roles')).toBe(true));
  });

  it('PERMIT-02: analyst lacks manage_roles', async () => {
    useAuthStore.setState({ user: asUser('role_analyst') });
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.has('manage_roles')).toBe(false));
  });

  it('PERMIT-03: null user → no permissions', async () => {
    useAuthStore.setState({ user: null });
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.has('view_entities')).toBe(false));
  });

  it('PERMIT-04: hasAny short-circuits on first match', async () => {
    useAuthStore.setState({ user: asUser('role_investigator') });
    const { result } = renderHook(() => usePermissions());
    await waitFor(() =>
      expect(result.current.hasAny(['manage_roles', 'view_audit'])).toBe(true),
    );
  });
});

describe('can() — RouteGuard / Permitted core logic', () => {
  it('GUARD-01: null user → always false (RouteGuard redirects)', () => {
    expect(can(null, BUILTIN_ROLES, 'view_audit')).toBe(false);
  });
  it('GUARD-02: missing perm → false (RouteGuard shows ACCESS DENIED)', () => {
    expect(can(asUser('role_analyst'), BUILTIN_ROLES, 'manage_roles')).toBe(false);
  });
  it('GUARD-03: granted perm → true (RouteGuard renders children)', () => {
    expect(can(asUser('role_admin'), BUILTIN_ROLES, 'manage_roles')).toBe(true);
  });
});
