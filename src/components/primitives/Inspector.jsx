import PropTypes from 'prop-types';
import clsx from 'clsx';

/**
 * Right-side inspector panel for a selected record.
 *
 * @param {Object} props
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} props.children
 * @param {() => void} [props.onClose]
 * @param {string} [props.className]
 */
export function Inspector({ title, subtitle, children, onClose, className }) {
  return (
    <aside
      className={clsx(
        'flex flex-col bg-bg-panel border-l border-border-subtle h-full min-h-0',
        className,
      )}
    >
      <header className="flex items-start justify-between px-2.5 py-1.5 border-b border-border-subtle flex-shrink-0">
        <div className="min-w-0">
          <div className="section-label">Inspector</div>
          {title ? (
            <div className="text-sm text-text-primary font-medium truncate mt-0.5">{title}</div>
          ) : null}
          {subtitle ? (
            <div className="text-micro text-text-muted tabular truncate">{subtitle}</div>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="text-text-muted hover:text-text-primary text-sm leading-none"
          >
            ×
          </button>
        ) : null}
      </header>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </aside>
  );
}

Inspector.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node,
  onClose: PropTypes.func,
  className: PropTypes.string,
};

/**
 * Key/value row used inside an inspector.
 */
export function KV({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-2.5 py-1 border-b border-border-subtle/60">
      <span className="section-label">{label}</span>
      <span className={clsx('text-xs text-text-primary truncate', mono && 'tabular')}>{value}</span>
    </div>
  );
}
KV.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  mono: PropTypes.bool,
};
