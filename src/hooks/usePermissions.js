import { useAuthStore } from '@/stores/authStore';
import { useRoles } from '@/hooks/useRoles';
import { can } from '@/lib/rbac';

/**
 * Returns helpers for checking the current user's permissions.
 *
 * @returns {{
 *   user: import('@/types').User|null,
 *   role: import('@/types').Role|undefined,
 *   has: (perm: import('@/types').Permission) => boolean,
 *   hasAny: (perms: import('@/types').Permission[]) => boolean,
 * }}
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const roles = useRoles();
  const role = roles.find((r) => r.id === user?.roleId);
  return {
    user,
    role,
    has: (perm) => can(user, roles, perm),
    hasAny: (perms) => perms.some((p) => can(user, roles, p)),
  };
}
