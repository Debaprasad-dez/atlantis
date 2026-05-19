import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { parseQuery } from '@/lib/query';

const FIELD_HINTS = [
  { f: 'type', e: 'type:person' },
  { f: 'country', e: 'country:RU' },
  { f: 'tag', e: 'tag:sanctioned' },
  { f: 'risk', e: 'risk:>80' },
  { f: 'name', e: 'name:halcyon' },
  { f: 'id', e: 'id:E000ABCD' },
];

/**
 * Chip-based query input. Parses the input continuously, shows clause chips
 * with × to remove, surfaces parser errors inline.
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {(v: string) => void} props.onChange
 * @param {() => void} [props.onSubmit]
 */
export function ChipQueryInput({ value, onChange, onSubmit }) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Reset draft when parent clears value externally
    if (!value) setDraft('');
  }, [value]);

  const { clauses, errors } = parseQuery(value);

  const removeClause = (idx) => {
    const next = clauses.filter((_, i) => i !== idx).map((c) => c.raw).join(' ');
    onChange(next);
  };

  const commitDraft = () => {
    if (!draft.trim()) return;
    const next = value ? `${value} ${draft.trim()}` : draft.trim();
    onChange(next);
    setDraft('');
  };

  const onKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft();
      onSubmit?.();
    } else if (e.key === 'Backspace' && !draft && clauses.length > 0) {
      removeClause(clauses.length - 1);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === ' ' && draft.includes(':')) {
      e.preventDefault();
      commitDraft();
    }
  };

  return (
    <div className="relative flex-1">
      <div
        className={clsx(
          'min-h-[28px] flex flex-wrap items-center gap-1 px-1.5 py-0.5 bg-bg-base border',
          errors.length ? 'border-accent-critical/60' : 'border-border-subtle',
          'focus-within:border-accent-primary/70',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {clauses.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-1.5 h-5 text-micro uppercase tracking-wider border border-accent-primary/40 bg-accent-primary/10 text-accent-primary"
          >
            <span className="mono">{c.field}</span>
            <span className="text-text-muted">{opSymbol(c.op)}</span>
            <span className="mono text-text-primary">{renderValue(c.value)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeClause(i);
              }}
              aria-label={`Remove ${c.raw}`}
              className="text-text-muted hover:text-accent-critical leading-none ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
          className="flex-1 min-w-[140px] bg-transparent outline-none text-sm text-text-primary placeholder:text-text-faint h-5"
          placeholder={clauses.length ? '' : 'type:person risk:>80 country:RU …'}
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-0.5 panel-elevated z-shell-overlay">
          <div className="px-2 py-1 section-label border-b border-border-subtle">SYNTAX</div>
          <ul className="text-xs">
            {FIELD_HINTS.map((h) => (
              <li
                key={h.f}
                onMouseDown={() => {
                  setDraft(h.e);
                  inputRef.current?.focus();
                }}
                className="px-2 py-1 flex items-center justify-between hover:bg-bg-hover cursor-pointer border-b border-border-subtle/40"
              >
                <span className="mono text-accent-primary">{h.f}</span>
                <span className="mono text-text-muted">{h.e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-0.5 panel-elevated border-accent-critical/50 text-micro p-1.5 z-shell-overlay">
          {errors.map((err, i) => (
            <div key={i} className="text-accent-critical truncate">⚠ {err}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function opSymbol(op) {
  return { eq: ':', gt: '>', lt: '<', gte: '≥', lte: '≤', range: '∈', in: '∈', contains: '~' }[op] || ':';
}
function renderValue(v) {
  if (Array.isArray(v)) {
    if (v.length === 2 && typeof v[0] === 'number') return `${v[0]}..${v[1]}`;
    return v.join(',');
  }
  return String(v);
}

ChipQueryInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
};
