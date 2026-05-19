import { describe, it, expect } from 'vitest';
import { ALL_PERMISSIONS, BUILTIN_ROLES, can } from './rbac';

const [analyst, investigator, admin] = BUILTIN_ROLES;

describe('rbac catalogue', () => {
  it('LIB-RBAC-01: 9 permissions across Read/Write/Admin groups', () => {
    expect(ALL_PERMISSIONS).toHaveLength(9);
    const groups = new Set(ALL_PERMISSIONS.map((p) => p.group));
    expect(groups).toEqual(new Set(['Read', 'Write', 'Admin']));
  });

  it('LIB-RBAC-02: BUILTIN_ROLES has 3 system roles', () => {
    expect(BUILTIN_ROLES).toHaveLength(3);
    expect(BUILTIN_ROLES.every((r) => r.system)).toBe(true);
  });

  it('LIB-RBAC-03: analyst has only the 3 read perms', () => {
    expect(analyst.permissions.sort()).toEqual(
      ['view_entities', 'view_relationships', 'view_events'].sort(),
    );
  });

  it('LIB-RBAC-04: investigator adds audit + investigations + export', () => {
    for (const p of ['view_audit', 'open_investigations', 'export_data']) {
      expect(investigator.permissions).toContain(p);
    }
  });

  it('LIB-RBAC-05: admin includes user + role management', () => {
    expect(admin.permissions).toContain('manage_users');
    expect(admin.permissions).toContain('manage_roles');
  });
});

describe('can()', () => {
  const user = (roleId) => ({ id: 'u1', name: 'X', email: 'x', roleId, createdAt: 0 });

  it('LIB-RBAC-06: null user → false', () => {
    expect(can(null, BUILTIN_ROLES, 'view_entities')).toBe(false);
  });
  it('LIB-RBAC-07: analyst can view_entities', () => {
    expect(can(user('role_analyst'), BUILTIN_ROLES, 'view_entities')).toBe(true);
  });
  it('LIB-RBAC-08: analyst cannot manage_roles', () => {
    expect(can(user('role_analyst'), BUILTIN_ROLES, 'manage_roles')).toBe(false);
  });
  it('LIB-RBAC-09: unknown permission → false', () => {
    expect(can(user('role_admin'), BUILTIN_ROLES, 'fly')).toBe(false);
  });
  it('LIB-RBAC-10: empty roles list → false', () => {
    expect(can(user('role_admin'), [], 'view_entities')).toBe(false);
  });
});
