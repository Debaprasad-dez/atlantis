import PropTypes from 'prop-types';
import clsx from 'clsx';

const COLORS = {
  healthy: 'bg-accent-success',
  degraded: 'bg-accent-warning',
  offline: 'bg-accent-critical',
  unknown: 'bg-text-muted',
};

/**
 * Tiny colored dot + label for source / system status.
 *
 * @param {Object} props
 * @param {'healthy'|'degraded'|'offline'|'unknown'} props.status
 * @param {string} [props.label]
 * @param {string} [props.className]
 */
export function StatusIndicator({ status, label, className }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', COLORS[status] || COLORS.unknown)} />
      {label ? (
        <span className="text-micro uppercase tracking-wider text-text-secondary">{label}</span>
      ) : null}
    </span>
  );
}

StatusIndicator.propTypes = {
  status: PropTypes.oneOf(['healthy', 'degraded', 'offline', 'unknown']).isRequired,
  label: PropTypes.string,
  className: PropTypes.string,
};
