import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * Lightweight overlay menu. Anchors to its trigger button, closes on outside
 * click and Escape. Items receive (close) so they can act and dismiss.
 *
 * @param {Object} props
 * @param {Array<{ key: string, label: string, icon?: string, danger?: boolean, disabled?: boolean, hint?: string, onSelect: () => void|Promise<void> }>} props.items
 * @param {React.ReactNode} [props.trigger]  override the ⋯ trigger
 * @param {string} [props.align]              'right' (default) | 'left'
 * @param {string} [props.label]              accessible label for the trigger
 */
export function Menu({ items, trigger, align = 'right', label = 'Open menu' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      {trigger ? (
        <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      ) : (
        <button
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="text-text-muted hover:text-text-primary px-1 text-sm leading-none"
        >
          ⋯
        </button>
      )}
      {open && (
        <div
          role="menu"
          className={clsx(
            'absolute top-full mt-1 min-w-[180px] panel-elevated z-shell-overlay',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <ul>
            {items.map((it) => (
              <li key={it.key}>
                <button
                  type="button"
                  role="menuitem"
                  disabled={it.disabled}
                  onClick={() => {
                    if (it.disabled) return;
                    // Close synchronously, then await — keeps the menu snappy
                    // and ensures the DOM updates even if onSelect is async.
                    setOpen(false);
                    Promise.resolve(it.onSelect()).catch(() => {});
                  }}
                  className={clsx(
                    'flex items-center gap-2 w-full px-2 h-7 text-xs text-left transition-colors',
                    it.danger
                      ? 'text-accent-critical hover:bg-accent-critical/10'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
                    it.disabled && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {it.icon ? <span className="w-3 text-text-muted">{it.icon}</span> : null}
                  <span className="flex-1 truncate">{it.label}</span>
                  {it.hint ? (
                    <kbd className="tabular text-micro text-text-muted">{it.hint}</kbd>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

Menu.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.string,
      danger: PropTypes.bool,
      disabled: PropTypes.bool,
      hint: PropTypes.string,
      onSelect: PropTypes.func.isRequired,
    }),
  ).isRequired,
  trigger: PropTypes.node,
  align: PropTypes.oneOf(['left', 'right']),
  label: PropTypes.string,
};
