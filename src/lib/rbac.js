/**
 * Role-based access control. All built-in roles + helpers for the custom role builder.
 * @typedef {import('@/types').Role} Role
 * @typedef {import('@/types').Permission} Permission
 * @typedef {import('@/types').User} User
 */

/** @type {{key: Permission, label: string, group: string}[]} */
export const ALL_PERMISSIONS = [
  { key: 'view_entities', label: 'View entities', group: 'Read' },
  { key: 'view_relationships', label: 'View relationships', group: 'Read' },
  { key: 'view_events', label: 'View events', group: 'Read' },
  { key: 'view_audit', label: 'View audit log', group: 'Read' },
  { key: 'edit_entities', label: 'Edit entities', group: 'Write' },
  { key: 'open_investigations', label: 'Open investigations', group: 'Write' },
  { key: 'export_data', label: 'Export data', group: 'Write' },
  { key: 'manage_users', label: 'Manage users', group: 'Admin' },
  { key: 'manage_roles', label: 'Manage roles', group: 'Admin' },
];

/** @type {Role[]} */
export const BUILTIN_ROLES = [
  {
    id: 'role_analyst',
    name: 'Analyst',
    description: 'Read-only access to entities, events, and relationships.',
    permissions: ['view_entities', 'view_relationships', 'view_events'],
    system: true,
  },
  {
    id: 'role_investigator',
    name: 'Investigator',
    description: 'Analyst access plus the ability to open investigations and export.',
    permissions: [
      'view_entities',
      'view_relationships',
      'view_events',
      'view_audit',
      'open_investigations',
      'export_data',
    ],
    system: true,
  },
  {
    id: 'role_admin',
    name: 'Admin',
    description: 'Full access including user and role management.',
    permissions: ALL_PERMISSIONS.map((p) => p.key),
    system: true,
  },
];

/**
 * Does the user's role include the given permission?
 * @param {User|null} user
 * @param {Role[]} roles
 * @param {Permission} permission
 * @returns {boolean}
 */
export function can(user, roles, permission) {
  if (!user) return false;
  const role = roles.find((r) => r.id === user.roleId);
  return !!role?.permissions.includes(permission);
}
