import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { Panel } from '@/components/primitives';

/**
 * Renders children only if the current user has the required permission.
 * Otherwise renders a "FORBIDDEN" panel (or redirects to /login if there is no user at all).
 *
 * @param {Object} props
 * @param {import('@/types').Permission} props.permission
 * @param {React.ReactNode} props.children
 */
export function RouteGuard({ permission, children }) {
  const { user, has } = usePermissions();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (!has(permission)) {
    return (
      <div className="h-full grid place-items-center bg-bg-base grid-bg p-4">
        <Panel
          elevated
          className="w-[480px]"
          header={<span className="section-label text-accent-critical">ACCESS DENIED</span>}
          footer={`Required: ${permission}`}
        >
          <div className="p-4 text-xs text-text-secondary leading-relaxed">
            Your role does not include the <code className="mono text-accent-critical">{permission}</code> permission.
            Ask an Admin to grant it or to assign you a role that includes it.
          </div>
        </Panel>
      </div>
    );
  }
  return children;
}

RouteGuard.propTypes = {
  permission: PropTypes.string.isRequired,
  children: PropTypes.node,
};
