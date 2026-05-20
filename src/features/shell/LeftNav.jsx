import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * @typedef {{ to: string, label: string, icon: string, requires?: import('@/types').Permission }} NavItem
 */

/** @type {NavItem[]} */
const NAV = [
  { to: '/', label: 'Dashboard', icon: '◫' },
  { to: '/entities', label: 'Entities', icon: '◉', requires: 'view_entities' },
  { to: '/graph', label: 'Graph', icon: '⬢', requires: 'view_relationships' },
  { to: '/investigations', label: 'Cases', icon: '⌬', requires: 'open_investigations' },
  { to: '/map', label: 'Geospatial', icon: '◎', requires: 'view_entities' },
  { to: '/anomalies', label: 'Anomalies', icon: '△', requires: 'view_events' },
  { to: '/reports', label: 'Reports', icon: '⊞', requires: 'export_data' },
  { to: '/audit', label: 'Audit log', icon: '☰', requires: 'view_audit' },
  { to: '/admin', label: 'Admin', icon: '⚙', requires: 'manage_roles' },
];

/**
 * @param {{collapsed?: boolean}} props
 */
export function LeftNav({ collapsed = false }) {
  const { has } = usePermissions();
  const visible = NAV.filter((item) => !item.requires || has(item.requires));
  return (
    <nav
      className={clsx(
        'flex flex-col bg-bg-elevated border-r border-border-subtle flex-shrink-0',
        collapsed ? 'w-10' : 'w-44',
      )}
    >
      <div className="px-2 py-2 section-label border-b border-border-subtle">
        {collapsed ? 'NAV' : 'NAVIGATION'}
      </div>
      <ul className="flex-1 overflow-auto py-1">
        {visible.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 px-2 h-7 text-xs border-l-2 transition-colors duration-150 ease-crisp',
                  isActive
                    ? 'border-accent-primary bg-accent-primary/8 text-text-primary'
                    : 'border-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary',
                )
              }
            >
              <span className="text-text-muted w-4 text-center">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
      {!collapsed && (
        <div className="px-2 py-1.5 border-t border-border-subtle text-micro text-text-muted uppercase tracking-wider">
          v0.4 · phase 4
        </div>
      )}
    </nav>
  );
}

LeftNav.propTypes = { collapsed: PropTypes.bool };
