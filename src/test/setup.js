/**
 * Vitest global setup.
 * - Injects fake IndexedDB (Dexie works against it identically).
 * - Adds jest-dom matchers.
 * - Mocks browser APIs not present in jsdom (Worker, ResizeObserver, matchMedia).
 * - Resets the Dexie store between tests for isolation.
 */
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// --- Worker stub (the live-tick + seed workers are mocked in dedicated tests) ---
class WorkerStub {
  constructor() {
    this.onmessage = null;
  }
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
if (typeof globalThis.Worker === 'undefined') globalThis.Worker = WorkerStub;

// --- ResizeObserver stub (react-virtuoso, force-graph) ---
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// --- matchMedia stub (some libs probe this) ---
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (q) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// --- Reset Dexie + localStorage between tests ---
beforeEach(async () => {
  const { db } = await import('@/db/schema');
  if (!db.isOpen()) await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// --- Mock heavy modules globally where they're not the unit under test ---
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => children ?? null,
  TileLayer: () => null,
  CircleMarker: () => null,
  Tooltip: () => null,
  Rectangle: () => null,
  useMap: () => ({
    setMinZoom: () => {},
    setMaxBounds: () => {},
    setView: () => {},
    fitBounds: () => {},
    getZoom: () => 2,
    on: () => {},
    off: () => {},
  }),
}));

vi.mock('react-force-graph-2d', () => ({
  default: () => null,
}));

// react-virtuoso virtualization can't measure layout in jsdom — replace it with a
// dumb table that simply renders all rows. Behavioral assertions still hold.
vi.mock('react-virtuoso', async () => {
  const React = await import('react');
  const TableVirtuoso = ({ data, components = {}, fixedHeaderContent, itemContent }) => {
    const Table = components.Table || ((p) => React.createElement('table', p));
    const TableHead = components.TableHead || ((p) => React.createElement('thead', p));
    const TableRow =
      components.TableRow || ((p) => React.createElement('tr', p));
    return React.createElement(
      Table,
      null,
      React.createElement(TableHead, null, fixedHeaderContent ? fixedHeaderContent() : null),
      React.createElement(
        'tbody',
        null,
        (data || []).map((row, i) =>
          React.createElement(TableRow, { key: i, item: row }, itemContent(i, row)),
        ),
      ),
    );
  };
  return { TableVirtuoso };
});

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map();
  const passthrough = (tag) => {
    if (cache.has(tag)) return cache.get(tag);
    const C = React.forwardRef((props, ref) => {
      // Strip framer-only props that React will warn about
      // eslint-disable-next-line no-unused-vars
      const { initial, animate, exit, transition, whileHover, whileTap, layout, ...rest } = props;
      return React.createElement(tag, { ...rest, ref });
    });
    cache.set(tag, C);
    return C;
  };
  return {
    motion: new Proxy(
      {},
      {
        get: (_, tag) => (typeof tag === 'string' ? passthrough(tag) : undefined),
      },
    ),
    AnimatePresence: ({ children }) => children,
  };
});
