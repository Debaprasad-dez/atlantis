import PropTypes from 'prop-types';
import clsx from 'clsx';

/**
 * Generic panel — bordered, dark surface with optional elevated background.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {boolean} [props.elevated]
 * @param {React.ReactNode} [props.header]
 * @param {React.ReactNode} [props.footer]
 */
export function Panel({ children, className, elevated = false, header, footer }) {
  return (
    <section
      className={clsx(
        'flex flex-col border border-border-subtle shadow-panel',
        elevated ? 'bg-bg-elevated' : 'bg-bg-panel',
        className,
      )}
    >
      {header ? (
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border-subtle">
          {header}
        </div>
      ) : null}
      <div className="flex-1 min-h-0">{children}</div>
      {footer ? (
        <div className="px-2.5 py-1 border-t border-border-subtle text-micro text-text-muted uppercase tracking-wider">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

Panel.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  elevated: PropTypes.bool,
  header: PropTypes.node,
  footer: PropTypes.node,
};
