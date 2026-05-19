import PropTypes from 'prop-types';
import clsx from 'clsx';

/**
 * Pulsing dot + label, signaling a live stream.
 *
 * @param {Object} props
 * @param {'live'|'idle'|'error'} [props.state]
 * @param {string} [props.label]
 * @param {string} [props.className]
 */
export function LiveBadge({ state = 'live', label = 'LIVE', className }) {
  const color =
    state === 'live'
      ? 'bg-accent-primary shadow-[0_0_6px_rgba(0,217,255,0.8)]'
      : state === 'error'
        ? 'bg-accent-critical shadow-[0_0_6px_rgba(255,71,71,0.8)]'
        : 'bg-text-muted';
  return (
    <span className={clsx('inline-flex items-center gap-1', className)}>
      <span
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          color,
          state === 'live' && 'animate-pulseDot',
        )}
      />
      <span className="text-micro uppercase tracking-wider text-text-secondary">{label}</span>
    </span>
  );
}

LiveBadge.propTypes = {
  state: PropTypes.oneOf(['live', 'idle', 'error']),
  label: PropTypes.string,
  className: PropTypes.string,
};
