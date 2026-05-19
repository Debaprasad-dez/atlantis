import PropTypes from 'prop-types';
import clsx from 'clsx';
import { LiveBadge } from './LiveBadge';
import { Menu } from './Menu';

/**
 * Dashboard tile — header, dense body, optional footer.
 *
 * Production-grade menu: pass `menuItems`, or pass the convenience callbacks
 * `onRefresh`/`onExpand`/`onCopy`/`onConfigure`/`onExport` and the tile builds
 * a standard menu. Either way the ⋯ button is fully functional.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.footer]
 * @param {boolean} [props.live]
 * @param {React.ReactNode} [props.actions]
 * @param {string} [props.span]
 * @param {Array<{ key: string, label: string, icon?: string, danger?: boolean, disabled?: boolean, hint?: string, onSelect: () => any }>} [props.menuItems]
 * @param {() => any} [props.onRefresh]
 * @param {() => any} [props.onExpand]
 * @param {() => any} [props.onCopy]
 * @param {() => any} [props.onConfigure]
 * @param {() => any} [props.onExport]
 */
export function Tile({
  title,
  children,
  className,
  footer,
  live = false,
  loading = false,
  actions,
  span,
  menuItems,
  onRefresh,
  onExpand,
  onCopy,
  onConfigure,
  onExport,
}) {
  const items = menuItems ?? buildDefaultItems({ onRefresh, onExpand, onCopy, onConfigure, onExport });
  return (
    <section
      className={clsx(
        'flex flex-col bg-bg-panel border border-border-subtle shadow-tile min-h-0 relative',
        span,
        className,
      )}
    >
      <header className="flex items-center justify-between px-2 h-7 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="section-label truncate">{title}</h3>
          {live ? <LiveBadge label="LIVE" /> : null}
          {loading ? (
            <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-pulseDot flex-shrink-0" />
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {actions}
          {items.length > 0 ? <Menu items={items} label={`${title} actions`} /> : null}
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {children}
        {loading ? (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-primary/60 to-transparent animate-scan" />
          </div>
        ) : null}
      </div>
      {footer ? (
        <footer className="px-2 py-1 border-t border-border-subtle text-micro uppercase tracking-wider text-text-muted truncate flex-shrink-0">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

/** Build a sensible default menu from the convenience callbacks. */
function buildDefaultItems({ onRefresh, onExpand, onCopy, onConfigure, onExport }) {
  const items = [];
  if (onRefresh) items.push({ key: 'refresh', label: 'Refresh data', icon: '↻', onSelect: onRefresh });
  if (onExpand) items.push({ key: 'expand', label: 'Expand to full view', icon: '⛶', onSelect: onExpand });
  if (onCopy) items.push({ key: 'copy', label: 'Copy visible data', icon: '⧉', onSelect: onCopy });
  if (onExport) items.push({ key: 'export', label: 'Export as CSV', icon: '↧', onSelect: onExport });
  if (onConfigure) items.push({ key: 'config', label: 'Configure…', icon: '⚙', onSelect: onConfigure });
  return items;
}

Tile.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
  footer: PropTypes.string,
  live: PropTypes.bool,
  loading: PropTypes.bool,
  actions: PropTypes.node,
  span: PropTypes.string,
  menuItems: PropTypes.array,
  onRefresh: PropTypes.func,
  onExpand: PropTypes.func,
  onCopy: PropTypes.func,
  onConfigure: PropTypes.func,
  onExport: PropTypes.func,
};
