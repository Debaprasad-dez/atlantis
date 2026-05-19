import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { db } from '@/db/schema';

const ACTIONS = [
  { id: 'nav-dash', label: 'Go to Dashboard', kind: 'Navigate', path: '/' },
  { id: 'nav-entities', label: 'Go to Entity Explorer', kind: 'Navigate', path: '/entities' },
  { id: 'nav-graph', label: 'Go to Graph View', kind: 'Navigate', path: '/graph' },
  { id: 'nav-cases', label: 'Go to Investigations', kind: 'Navigate', path: '/investigations' },
  { id: 'nav-admin', label: 'Go to Admin / Roles', kind: 'Navigate', path: '/admin' },
];

/** Fuzzy match: every char of query appears in order in candidate (case-insensitive). */
function matches(q, s) {
  if (!q) return true;
  const qq = q.toLowerCase();
  const ss = s.toLowerCase();
  let i = 0;
  for (const c of ss) {
    if (c === qq[i]) i++;
    if (i === qq.length) return true;
  }
  return i === qq.length;
}

export function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen);
  const setOpen = useUIStore((s) => s.setPaletteOpen);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [entityHits, setEntityHits] = useState([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) {
      setQ('');
      setEntityHits([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !q) {
      setEntityHits([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const lim = 8;
      const out = [];
      await db.entities
        .orderBy('riskScore')
        .reverse()
        .until(() => out.length >= lim)
        .each((e) => {
          if (matches(q, e.name) || matches(q, e.id)) out.push(e);
        });
      if (!cancelled) setEntityHits(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [q, open]);

  const actionHits = useMemo(() => ACTIONS.filter((a) => matches(q, a.label)), [q]);
  const all = useMemo(
    () => [
      ...actionHits.map((a) => ({ ...a, _kind: 'action' })),
      ...entityHits.map((e) => ({
        id: e.id,
        label: e.name,
        kind: e.type.toUpperCase(),
        path: `/entities?focus=${e.id}`,
        _kind: 'entity',
      })),
    ],
    [actionHits, entityHits],
  );

  if (!open) return null;

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, all.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const sel = all[active];
      if (sel) {
        navigate(sel.path);
        setOpen(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-palette bg-black/70 backdrop-blur-[1px] flex items-start justify-center pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[640px] max-w-[92vw] panel-elevated shadow-glow bg-bg-elevated"
      >
        <div className="px-3 py-2 border-b border-border-subtle flex items-center gap-2">
          <span className="text-text-muted">⌕</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search entities, run actions, navigate…"
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-faint"
          />
          <kbd className="tabular text-micro text-text-muted border border-border-subtle px-1">
            ESC
          </kbd>
        </div>
        <ul className="max-h-96 overflow-auto">
          {all.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-text-muted">No matches.</li>
          ) : (
            all.map((item, idx) => (
              <li
                key={`${item._kind}-${item.id}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => {
                  navigate(item.path);
                  setOpen(false);
                }}
                className={`flex items-center justify-between px-3 h-7 text-xs cursor-pointer ${
                  idx === active ? 'bg-accent-primary/10 text-text-primary' : 'text-text-secondary'
                }`}
              >
                <span className="truncate flex items-center gap-2">
                  <span
                    className={`section-label ${
                      item._kind === 'action' ? 'text-accent-primary' : 'text-viz-magenta'
                    }`}
                  >
                    {item.kind}
                  </span>
                  <span>{item.label}</span>
                </span>
                <kbd className="tabular text-micro text-text-muted">↵</kbd>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
