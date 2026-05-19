import PropTypes from 'prop-types';
import { useEffect } from 'react';
import clsx from 'clsx';

/**
 * Modal overlay. Closes on backdrop click and Escape. Sits above Leaflet panes.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]
 * @param {string} [props.size]   'sm' | 'md' | 'lg' | 'xl' | 'full'
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = {
    sm: 'w-[420px]',
    md: 'w-[640px]',
    lg: 'w-[920px]',
    xl: 'w-[1180px]',
    full: 'w-[96vw] h-[92vh]',
  }[size] || 'w-[640px]';

  return (
    <div
      className="fixed inset-0 z-palette bg-black/70 backdrop-blur-[1px] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'panel-elevated shadow-glow flex flex-col max-h-[92vh] max-w-[96vw]',
          widthClass,
        )}
      >
        <header className="flex items-center justify-between px-3 py-2 border-b border-border-emphasis flex-shrink-0">
          <span className="section-label text-text-primary">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary text-sm leading-none"
          >
            ×
          </button>
        </header>
        <div className="flex-1 min-h-0 overflow-auto">{children}</div>
        {footer ? (
          <footer className="px-3 py-2 border-t border-border-subtle flex justify-end gap-2 flex-shrink-0">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
};
