import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState, Children } from 'react';
import clsx from 'clsx';

/**
 * Two-pane container with a draggable handle between children.
 *
 *   <Splitter id="explorer-facets" direction="row" primary="first" initialSize={224} minSize={160} maxSize={420}>
 *     <FacetsPanel />
 *     <MainContent />
 *   </Splitter>
 *
 * For three-pane layouts, nest Splitters:
 *
 *   <Splitter id="x" primary="first" initialSize={224}>
 *     <Left />
 *     <Splitter id="x-r" primary="second" initialSize={320}>
 *       <Center />
 *       <Right />
 *     </Splitter>
 *   </Splitter>
 *
 * Sizes persist to localStorage under `atlantis.split.<id>`. Double-click the
 * handle to reset.
 *
 * @param {Object} props
 * @param {string} [props.id]                  persistence key
 * @param {'row'|'column'} [props.direction]   pane orientation (row = side-by-side)
 * @param {'first'|'second'} [props.primary]   which pane is the fixed-size one
 * @param {number} [props.initialSize]         px size of the primary pane
 * @param {number} [props.minSize]
 * @param {number} [props.maxSize]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children     exactly two children
 */
export function Splitter({
  id,
  direction = 'row',
  primary = 'first',
  initialSize = 280,
  minSize = 160,
  maxSize = 720,
  className,
  children,
}) {
  const kids = Children.toArray(children);
  if (kids.length !== 2) {
    // eslint-disable-next-line no-console
    console.warn('Splitter expects exactly 2 children, got', kids.length);
  }

  const storageKey = id ? `atlantis.split.${id}` : null;
  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined' || !storageKey) return initialSize;
    const v = window.localStorage.getItem(storageKey);
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : initialSize;
  });

  // Persist on settle
  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) return;
    window.localStorage.setItem(storageKey, String(size));
  }, [size, storageKey]);

  const containerRef = useRef(null);
  const drag = useRef(/** @type {null|{startSize:number, startPos:number}} */ (null));

  const onPointerDown = useCallback(
    (e) => {
      e.preventDefault();
      const pos = direction === 'row' ? e.clientX : e.clientY;
      drag.current = { startSize: size, startPos: pos };
      document.body.style.cursor = direction === 'row' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [direction, size],
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!drag.current) return;
      const pos = direction === 'row' ? e.clientX : e.clientY;
      const delta = pos - drag.current.startPos;
      const sign = primary === 'first' ? 1 : -1;
      // Cap against container if available
      const rect = containerRef.current?.getBoundingClientRect();
      const containerSize = rect ? (direction === 'row' ? rect.width : rect.height) : Infinity;
      const cap = Math.max(minSize, containerSize - 80);
      const limit = Math.min(maxSize, cap);
      const next = Math.max(minSize, Math.min(limit, drag.current.startSize + sign * delta));
      setSize(next);
    };
    const onUp = () => {
      if (drag.current) {
        drag.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', (e) => onMove(e.touches[0]), { passive: false });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [direction, minSize, maxSize, primary]);

  const reset = () => setSize(initialSize);
  const onKey = (e) => {
    const step = e.shiftKey ? 32 : 8;
    if (direction === 'row') {
      if (e.key === 'ArrowLeft') setSize((s) => Math.max(minSize, s - step));
      if (e.key === 'ArrowRight') setSize((s) => Math.min(maxSize, s + step));
    } else {
      if (e.key === 'ArrowUp') setSize((s) => Math.max(minSize, s - step));
      if (e.key === 'ArrowDown') setSize((s) => Math.min(maxSize, s + step));
    }
  };

  const isRow = direction === 'row';
  const firstSize = primary === 'first' ? `${size}px` : 'minmax(0, 1fr)';
  const secondSize = primary === 'first' ? 'minmax(0, 1fr)' : `${size}px`;
  const template = `${firstSize} 6px ${secondSize}`;

  return (
    <div
      ref={containerRef}
      className={clsx('h-full w-full min-h-0 min-w-0 overflow-hidden', className)}
      style={isRow ? { display: 'grid', gridTemplateColumns: template } : { display: 'grid', gridTemplateRows: template }}
    >
      <div className="min-h-0 min-w-0 overflow-hidden">{kids[0]}</div>
      <div
        role="separator"
        tabIndex={0}
        aria-orientation={isRow ? 'vertical' : 'horizontal'}
        aria-label="Resize panel"
        title="Drag to resize · double-click to reset"
        onMouseDown={onPointerDown}
        onTouchStart={(e) => onPointerDown(e.touches[0])}
        onDoubleClick={reset}
        onKeyDown={onKey}
        className={clsx(
          'relative bg-border-subtle hover:bg-accent-primary/60 focus-visible:bg-accent-primary transition-colors',
          isRow ? 'cursor-col-resize' : 'cursor-row-resize',
          // Visible grip dots
          'before:content-[""] before:absolute before:inset-0 before:m-auto',
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'absolute inset-0 m-auto opacity-50',
            isRow ? 'w-[2px] h-6 bg-border-emphasis' : 'h-[2px] w-6 bg-border-emphasis',
          )}
        />
      </div>
      <div className="min-h-0 min-w-0 overflow-hidden">{kids[1]}</div>
    </div>
  );
}

Splitter.propTypes = {
  id: PropTypes.string,
  direction: PropTypes.oneOf(['row', 'column']),
  primary: PropTypes.oneOf(['first', 'second']),
  initialSize: PropTypes.number,
  minSize: PropTypes.number,
  maxSize: PropTypes.number,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
