import PropTypes from 'prop-types';
import clsx from 'clsx';

/**
 * Removable filter chip used in query bars / faceted filters.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string|number} [props.value]
 * @param {boolean} [props.active]
 * @param {() => void} [props.onRemove]
 * @param {() => void} [props.onClick]
 */
export function FilterChip({ label, value, active = false, onRemove, onClick }) {
  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 px-1.5 h-5 text-micro uppercase tracking-wider border transition-colors duration-150 ease-crisp',
        active
          ? 'border-accent-primary/60 bg-accent-primary/10 text-accent-primary'
          : 'border-border-subtle bg-bg-elevated text-text-secondary hover:border-border-emphasis hover:text-text-primary',
        onClick && 'cursor-pointer',
      )}
    >
      <span>{label}</span>
      {value != null ? (
        <span className="tabular text-text-muted font-medium">{value}</span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-text-muted hover:text-accent-critical leading-none"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

FilterChip.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  active: PropTypes.bool,
  onRemove: PropTypes.func,
  onClick: PropTypes.func,
};
