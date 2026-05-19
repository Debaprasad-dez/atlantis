import PropTypes from 'prop-types';
import clsx from 'clsx';

/**
 * Horizontal risk bar 0-100 with discrete severity tinting.
 *
 * @param {Object} props
 * @param {number} props.score
 * @param {string} [props.className]
 * @param {boolean} [props.showValue]
 */
export function RiskBar({ score, className, showValue = true }) {
  const s = Math.max(0, Math.min(100, score ?? 0));
  const display = Math.round(s);
  const tone =
    s >= 80
      ? 'bg-accent-critical'
      : s >= 60
        ? 'bg-accent-warning'
        : s >= 40
          ? 'bg-viz-amber'
          : 'bg-accent-success';
  return (
    <div className={clsx('flex items-center gap-1.5 w-full min-w-0', className)}>
      <div className="flex-1 h-1.5 bg-bg-base border border-border-subtle overflow-hidden min-w-0">
        <div className={clsx('h-full', tone)} style={{ width: `${s}%` }} />
      </div>
      {showValue ? (
        <span className="tabular text-micro text-text-secondary w-7 text-right flex-shrink-0">{display}</span>
      ) : null}
    </div>
  );
}

RiskBar.propTypes = {
  score: PropTypes.number.isRequired,
  className: PropTypes.string,
  showValue: PropTypes.bool,
};
