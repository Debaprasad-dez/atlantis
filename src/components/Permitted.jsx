import PropTypes from 'prop-types';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Gates its children behind a permission check. Renders `fallback` (or nothing)
 * when the current user lacks the permission.
 *
 * @param {Object} props
 * @param {import('@/types').Permission} props.permission
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.fallback]
 */
export function Permitted({ permission, children, fallback = null }) {
  const { has } = usePermissions();
  return has(permission) ? children : fallback;
}

Permitted.propTypes = {
  permission: PropTypes.string.isRequired,
  children: PropTypes.node,
  fallback: PropTypes.node,
};
