import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRoles } from './useRoles';
import { db } from '@/db/schema';
import { BUILTIN_ROLES } from '@/lib/rbac';

describe('useRoles', () => {
  it('HOOK-RO-01: falls back to BUILTIN_ROLES when table is empty', async () => {
    const { result } = renderHook(() => useRoles());
    await waitFor(() => expect(result.current.length).toBe(BUILTIN_ROLES.length));
    expect(result.current.map((r) => r.id).sort()).toEqual(
      BUILTIN_ROLES.map((r) => r.id).sort(),
    );
  });

  it('HOOK-RO-02: reads stored roles', async () => {
    await db.roles.bulkPut([
      ...BUILTIN_ROLES,
      {
        id: 'role_custom',
        name: 'Custom',
        description: 'x',
        permissions: ['view_entities'],
        system: false,
      },
    ]);
    const { result } = renderHook(() => useRoles());
    await waitFor(() => expect(result.current.length).toBe(BUILTIN_ROLES.length + 1));
    expect(result.current.find((r) => r.id === 'role_custom')).toBeTruthy();
  });
});
