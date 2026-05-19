import PropTypes from 'prop-types';
import clsx from 'clsx';
import { Sparkline } from './Sparkline';

/**
 * Dense KPI — label, big number, delta indicator, optional sparkline.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {number} [props.delta]
 * @param {string} [props.unit]
 * @param {number[]} [props.spark]
 * @param {'cyan'|'amber'|'critical'|'success'} [props.tone]
 * @param {string} [props.className]
 */
export function MetricCard({ label, value, delta, unit, spark, tone = 'cyan', className }) {
  const sparkStroke =
    tone === 'amber'
      ? '#FFB627'
      : tone === 'critical'
        ? '#FF4747'
        : tone === 'success'
          ? '#22D3A6'
          : '#00D9FF';
  const sparkFill =
    tone === 'amber'
      ? 'rgba(255,182,39,0.12)'
      : tone === 'critical'
        ? 'rgba(255,71,71,0.12)'
        : tone === 'success'
          ? 'rgba(34,211,166,0.12)'
          : 'rgba(0,217,255,0.10)';
  const deltaColor =
    delta == null
      ? 'text-text-muted'
      : delta > 0
        ? 'text-accent-success'
        : delta < 0
          ? 'text-accent-critical'
          : 'text-text-muted';
  return (
    <div className={clsx('flex flex-col justify-between px-2 py-1.5 h-full min-w-0', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="section-label truncate">{label}</span>
        {delta != null ? (
          <span className={clsx('text-micro tabular font-medium', deltaColor)}>
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}%
          </span>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-2 mt-1">
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="tabular text-xl text-text-primary font-semibold tracking-tight truncate">
            {value}
          </span>
          {unit ? <span className="text-micro text-text-muted uppercase">{unit}</span> : null}
        </div>
        {spark ? <Sparkline values={spark} stroke={sparkStroke} fill={sparkFill} /> : null}
      </div>
    </div>
  );
}

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  delta: PropTypes.number,
  unit: PropTypes.string,
  spark: PropTypes.arrayOf(PropTypes.number),
  tone: PropTypes.oneOf(['cyan', 'amber', 'critical', 'success']),
  className: PropTypes.string,
};
