import PropTypes from 'prop-types';

/**
 * Boot splash shown while the seed worker populates IndexedDB.
 * Progress messages stream from useSeed().
 */
export default function BootSplash({ stage, done, total, error }) {
  const pct = total ? Math.min(100, (done / total) * 100) : 0;
  return (
    <div className="h-full grid place-items-center bg-bg-base grid-bg">
      <div className="w-[520px] panel-elevated scan-line">
        <div className="px-3 py-2 border-b border-border-emphasis flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border border-accent-primary relative">
              <div className="absolute inset-0.5 bg-accent-primary/30 animate-pulseDot" />
            </div>
            <span className="section-label text-text-primary">
              ATLANTIS // BOOT SEQUENCE
            </span>
          </div>
          <span className="text-micro tabular text-text-muted">
            {error ? 'FAULT' : 'INITIALIZING'}
          </span>
        </div>
        <div className="p-4">
          <div className="section-label mb-2">
            STAGE&nbsp;·&nbsp;
            <span className="text-accent-primary">{stage}</span>
          </div>
          <div className="h-2 bg-bg-base border border-border-subtle overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-all duration-150 ease-crisp"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 tabular text-micro text-text-muted">
            <span>{done.toLocaleString()} / {total.toLocaleString()}</span>
            <span>{pct.toFixed(1)}%</span>
          </div>
          <p className="text-micro text-text-muted mt-4 leading-relaxed">
            Seeding 50k entities · 200k relationships · 500k events into IndexedDB.
            First run only — subsequent boots are instant.
          </p>
          {error ? (
            <p className="text-xs text-accent-critical mt-2 tabular">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

BootSplash.propTypes = {
  stage: PropTypes.string.isRequired,
  done: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  error: PropTypes.string,
};
