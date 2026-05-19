import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilterChip, Inspector, KV, RiskBar, Menu, Splitter } from '@/components/primitives';
import { useGraphData } from '@/hooks/useGraphData';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';
import { fmtDateTime } from '@/lib/format';
import { db } from '@/db/schema';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/stores/toastStore';
import { GraphTutorialOverlay } from './GraphTutorialOverlay';

const EDGE_KINDS = [
  'transacts_with',
  'owns',
  'controls',
  'communicates_with',
  'co_located',
  'shares_device',
];

const LAYOUTS = [
  { key: 'force', label: 'FORCE' },
  { key: 'radial', label: 'RADIAL' },
  { key: 'grid', label: 'GRID' },
];

const KIND_COLOR = {
  transacts_with: '#00D9FF',
  owns: '#22D3A6',
  controls: '#FFB627',
  communicates_with: '#A78BFA',
  co_located: '#FF7A6B',
  shares_device: '#FF4ECD',
};

const TYPE_LABEL = {
  person: 'P',
  organization: 'O',
  account: 'A',
  transaction: 'T',
  location: 'L',
  device: 'D',
};

export default function GraphView() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const focusId = params.get('focus');

  const [kinds, setKinds] = useState(new Set(EDGE_KINDS));
  const [layout, setLayout] = useState('force');
  const [minRisk, setMinRisk] = useState(0);
  const [maxEdges, setMaxEdges] = useState(200);
  const [scrubT, setScrubT] = useState(1);
  const [selected, setSelected] = useState(null);
  const [selection, setSelection] = useState(/** @type {Set<string>} */ (new Set()));
  const [pinned, setPinned] = useState(/** @type {Set<string>} */ (new Set()));
  const [hidden, setHidden] = useState(/** @type {Set<string>} */ (new Set()));
  const [contextMenu, setContextMenu] = useState(null);
  const [openCases, setOpenCases] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);

  const [ForceGraph, setForceGraph] = useState(null);
  useEffect(() => {
    import('react-force-graph-2d').then((m) => setForceGraph(() => m.default));
  }, []);

  useEffect(() => {
    db.investigations.where('status').notEqual('closed').toArray().then(setOpenCases);
  }, [contextMenu]);

  const now = useMemo(() => Date.now(), []);
  const beforeTs = useMemo(() => {
    const span = 180 * 24 * 60 * 60 * 1000;
    return now - span + scrubT * span;
  }, [now, scrubT]);

  const raw = useGraphData({ kinds: [...kinds], maxEdges, minRisk, beforeTs });

  // Apply hidden filter
  const visible = useMemo(() => {
    if (hidden.size === 0) return raw;
    const okIds = new Set(raw.nodes.filter((n) => !hidden.has(n.id)).map((n) => n.id));
    return {
      ...raw,
      nodes: raw.nodes.filter((n) => okIds.has(n.id)),
      links: raw.links.filter((l) => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return okIds.has(s) && okIds.has(t);
      }),
    };
  }, [raw, hidden]);

  const { nodes, links, loading } = visible;

  const degree = useMemo(() => {
    const d = new Map();
    for (const l of links) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      d.set(s, (d.get(s) ?? 0) + 1);
      d.set(t, (d.get(t) ?? 0) + 1);
    }
    return d;
  }, [links]);

  const fgRef = useRef(null);
  const canvasRef = useRef(null);

  // Apply layout positions on nodes
  useEffect(() => {
    if (layout === 'grid') {
      const cols = Math.ceil(Math.sqrt(nodes.length));
      nodes.forEach((n, i) => {
        if (pinned.has(n.id)) return;
        n.fx = (i % cols) * 32 - cols * 16;
        n.fy = Math.floor(i / cols) * 32 - cols * 16;
      });
    } else if (layout === 'radial') {
      nodes.forEach((n, i) => {
        if (pinned.has(n.id)) return;
        const r = 30 + (n.risk ?? 0) * 0.6;
        const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
        n.fx = Math.cos(angle) * r;
        n.fy = Math.sin(angle) * r;
      });
    } else {
      nodes.forEach((n) => {
        if (pinned.has(n.id)) return;
        delete n.fx;
        delete n.fy;
      });
    }
    try {
      fgRef.current?.d3ReheatSimulation?.();
    } catch {
      /* noop */
    }
  }, [layout, nodes, pinned]);

  // Focus deep-link from query param
  useEffect(() => {
    if (!focusId || !nodes.length || !fgRef.current) return;
    const n = nodes.find((x) => x.id === focusId);
    if (n) {
      setSelected(n);
      try {
        fgRef.current.centerAt?.(n.x ?? 0, n.y ?? 0, 600);
        fgRef.current.zoom?.(4, 600);
      } catch {
        /* noop */
      }
    }
  }, [focusId, nodes]);

  const onSelect = (n) => {
    setSelected(n);
    if (n) audit(user?.id, 'view_node', n.id, { context: 'graph' });
  };

  const toggleKind = (k) =>
    setKinds((s) => {
      const next = new Set(s);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const toggleInSet = (setter) => (id) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const togglePin = toggleInSet(setPinned);
  const toggleHide = toggleInSet(setHidden);
  const toggleSelect = toggleInSet(setSelection);

  const neighbors = useMemo(() => {
    if (!selected) return [];
    const out = [];
    for (const l of links) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === selected.id) out.push({ id: t, kind: l.kind, weight: l.weight });
      else if (t === selected.id) out.push({ id: s, kind: l.kind, weight: l.weight });
    }
    return out.slice(0, 30);
  }, [selected, links]);

  const expandNeighbors = useCallback(
    async (nodeId) => {
      const expanded = await db.relationships
        .where('sourceId')
        .equals(nodeId)
        .or('targetId')
        .equals(nodeId)
        .limit(25)
        .toArray();
      // pull missing nodes into the visible graph by un-hiding them
      const ids = new Set();
      expanded.forEach((r) => {
        ids.add(r.sourceId);
        ids.add(r.targetId);
      });
      setHidden((h) => {
        const next = new Set(h);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      audit(user?.id, 'expand_neighbors', nodeId, { added: ids.size });
      toast.info(`Expanded ${ids.size - 1} neighbors of ${nodeId}`);
    },
    [user?.id],
  );

  const addSelectionToCase = async (caseId) => {
    const ids = selection.size > 0 ? [...selection] : selected ? [selected.id] : [];
    if (!ids.length) return;
    const c = await db.investigations.get(caseId);
    if (!c) return;
    const entityIds = Array.from(new Set([...(c.entityIds || []), ...ids]));
    await db.investigations.update(caseId, { entityIds, updatedAt: Date.now() });
    audit(user?.id, 'edit_case', caseId, { added: ids });
    toast.success(`Added ${ids.length} to “${c.title}”`);
    setSelection(new Set());
  };

  // Right-click context menu position
  const onNodeRightClick = (n, evt) => {
    evt?.preventDefault?.();
    const x = evt?.clientX ?? 0;
    const y = evt?.clientY ?? 0;
    setContextMenu({ node: n, x, y });
    setSelected(n);
  };

  const onNodeClick = (n, evt) => {
    if (evt?.shiftKey) {
      toggleSelect(n.id);
    } else {
      onSelect(n);
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-base">
      {/* Top action bar */}
      <div className="h-9 flex items-center gap-3 px-2 bg-bg-elevated border-b border-border-subtle flex-shrink-0">
        <span className="section-label">GRAPH VIEW</span>
        <span className="tabular text-micro text-text-muted">
          {loading ? 'loading…' : `${nodes.length} nodes · ${links.length} edges`}
          {selection.size > 0 ? ` · ${selection.size} selected` : ''}
          {pinned.size > 0 ? ` · ${pinned.size} pinned` : ''}
          {hidden.size > 0 ? ` · ${hidden.size} hidden` : ''}
        </span>
        <div className="flex-1" />
        {selection.size > 0 && (
          <Menu
            trigger={<button type="button" className="btn h-7 btn-primary">SELECTION ⋯</button>}
            items={[
              {
                key: 'pin',
                label: `Pin ${selection.size}`,
                icon: '⊙',
                onSelect: () => {
                  setPinned((p) => new Set([...p, ...selection]));
                  toast.success(`Pinned ${selection.size}`);
                },
              },
              {
                key: 'hide',
                label: `Hide ${selection.size}`,
                icon: '◌',
                onSelect: () => {
                  setHidden((h) => new Set([...h, ...selection]));
                  toast.info(`Hid ${selection.size}`);
                  setSelection(new Set());
                },
              },
              {
                key: 'copy',
                label: 'Copy IDs',
                icon: '⧉',
                onSelect: async () => {
                  await copyText([...selection].join('\n'));
                  toast.success('IDs copied');
                },
              },
              { key: 'clear', label: 'Clear selection', icon: '⌫', onSelect: () => setSelection(new Set()) },
            ]}
          />
        )}
        <button
          type="button"
          className="btn h-7"
          onClick={() => setShowTutorial(true)}
          title="How to read this graph"
        >
          ? HOW TO READ
        </button>
        <button type="button" className="btn h-7" onClick={() => fgRef.current?.zoomToFit?.(400, 60)}>
          ⤡ FIT
        </button>
        <button
          type="button"
          className="btn h-7"
          onClick={() => {
            setHidden(new Set());
            toast.info('Hidden set cleared');
          }}
          disabled={hidden.size === 0}
        >
          UNHIDE ALL
        </button>
        <div className="flex items-center gap-1">
          {LAYOUTS.map((l) => (
            <FilterChip key={l.key} label={l.label} active={layout === l.key} onClick={() => setLayout(l.key)} />
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Splitter id="graph.controls" direction="row" primary="first" initialSize={224} minSize={180} maxSize={400}>
        <aside className="h-full bg-bg-panel border-r border-border-subtle overflow-auto">
          <div className="section-label px-2 py-1.5 border-b border-border-subtle">EDGE KINDS</div>
          <div className="p-2 flex flex-wrap gap-1">
            {EDGE_KINDS.map((k) => (
              <FilterChip key={k} label={k} active={kinds.has(k)} onClick={() => toggleKind(k)} />
            ))}
          </div>
          <div className="section-label px-2 py-1.5 border-y border-border-subtle">RISK FILTER</div>
          <div className="px-2 py-2">
            <input type="range" min="0" max="100" value={minRisk} onChange={(e) => setMinRisk(+e.target.value)} className="w-full accent-accent-primary" />
            <div className="flex justify-between text-micro tabular text-text-muted mt-1">
              <span>min risk</span><span>{minRisk}</span>
            </div>
          </div>
          <div className="section-label px-2 py-1.5 border-y border-border-subtle">EDGE LIMIT</div>
          <div className="px-2 py-2">
            <input type="range" min="50" max="800" step="50" value={maxEdges} onChange={(e) => setMaxEdges(+e.target.value)} className="w-full accent-accent-primary" />
            <div className="flex justify-between text-micro tabular text-text-muted mt-1">
              <span>limit</span><span>{maxEdges}</span>
            </div>
          </div>
          <div className="section-label px-2 py-1.5 border-y border-border-subtle">HINTS</div>
          <ul className="px-2 py-2 space-y-1 text-micro text-text-muted">
            <li>Click node — inspect</li>
            <li>Shift-click — multi-select</li>
            <li>Right-click — actions</li>
            <li>FIT — zoom to extents</li>
          </ul>
          <div className="section-label px-2 py-1.5 border-y border-border-subtle">LEGEND · EDGES</div>
          <ul className="p-2 space-y-1">
            {EDGE_KINDS.map((k) => (
              <li key={k} className="flex items-center gap-1.5 text-micro">
                <span className="h-0.5 w-4 inline-block flex-shrink-0" style={{ background: KIND_COLOR[k] }} />
                <span className="text-text-secondary">{k}</span>
              </li>
            ))}
          </ul>
          <div className="section-label px-2 py-1.5 border-y border-border-subtle">LEGEND · NODES</div>
          <ul className="p-2 space-y-1">
            {[
              { icon: '●', color: '#FF4747', label: 'Risk > 80 (critical)' },
              { icon: '●', color: '#FFB627', label: 'Risk 60–80 (elevated)' },
              { icon: '●', color: '#00D9FF', label: 'Risk < 60 (normal)' },
              { icon: '●', color: '#22D3A6', label: 'Pinned node' },
              { icon: '●', color: '#FFFFFF', label: 'Selected node' },
            ].map((r) => (
              <li key={r.label} className="flex items-center gap-1.5 text-micro">
                <span style={{ color: r.color }} className="text-xs leading-none flex-shrink-0">{r.icon}</span>
                <span className="text-text-secondary">{r.label}</span>
              </li>
            ))}
          </ul>
          <div className="section-label px-2 py-1.5 border-y border-border-subtle">LEGEND · TYPES</div>
          <ul className="p-2 space-y-1">
            {[
              { icon: '👤', type: 'person' },
              { icon: '🏢', type: 'organization' },
              { icon: '💳', type: 'account' },
              { icon: '💸', type: 'transaction' },
              { icon: '📍', type: 'location' },
              { icon: '📱', type: 'device' },
            ].map((r) => (
              <li key={r.type} className="flex items-center gap-1.5 text-micro">
                <span className="text-xs leading-none">{r.icon}</span>
                <span className="text-text-secondary">{r.type}</span>
              </li>
            ))}
          </ul>
        </aside>

        <Splitter id="graph.inspector" direction="row" primary="second" initialSize={320} minSize={240} maxSize={520}>
        {/* Center canvas */}
        <main ref={canvasRef} className="h-full min-w-0 relative bg-bg-elevated">
          {ForceGraph ? (
            <ForceGraph
              ref={fgRef}
              graphData={{ nodes, links }}
              backgroundColor="#0F1419"
              nodeRelSize={4}
              nodeColor={(n) =>
                selection.has(n.id)
                  ? '#FFFFFF'
                  : pinned.has(n.id)
                    ? '#22D3A6'
                    : n.risk > 80
                      ? '#FF4747'
                      : n.risk > 60
                        ? '#FFB627'
                        : '#00D9FF'
              }
              nodeVal={(n) => 1 + (degree.get(n.id) ?? 0) * 0.3 + (n.risk ?? 0) * 0.05}
              linkColor={(l) => KIND_COLOR[l.kind] ?? 'rgba(148,163,184,0.3)'}
              linkWidth={(l) => 0.5 + (l.weight ?? 0)}
              nodeCanvasObjectMode={() => 'after'}
              nodeCanvasObject={(n, ctx, globalScale) => {
                if (globalScale < 3) return;
                const label = TYPE_LABEL[n.type] ?? '?';
                const r = Math.max(4, Math.sqrt(1 + (degree.get(n.id) ?? 0) * 0.3 + (n.risk ?? 0) * 0.05) * 4);
                ctx.font = `bold ${Math.max(6, r * 0.7)}px JetBrains Mono`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(0,0,0,0.75)';
                ctx.fillText(label, n.x, n.y);
              }}
              linkDirectionalParticles={(l) => (l.kind === 'transacts_with' ? 2 : 0)}
              linkDirectionalParticleColor={(l) => KIND_COLOR[l.kind]}
              linkDirectionalParticleSpeed={0.006}
              onNodeClick={onNodeClick}
              onNodeRightClick={onNodeRightClick}
              onBackgroundClick={() => { onSelect(null); setContextMenu(null); }}
              onBackgroundRightClick={() => setContextMenu(null)}
              cooldownTicks={120}
            />
          ) : (
            <div className="h-full grid place-items-center">
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 border border-accent-primary/30 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-2 border-t border-accent-primary rounded-full animate-spin" style={{ animationDuration: '1.2s' }} />
                  <div className="absolute inset-4 bg-accent-primary/20 rounded-full animate-pulseDot" />
                </div>
                <span className="section-label text-text-muted">Loading graph engine…</span>
              </div>
            </div>
          )}

          {contextMenu && (
            <div
              className="fixed z-shell-overlay panel-elevated min-w-[220px]"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="section-label px-2 py-1.5 border-b border-border-subtle bg-bg-elevated truncate">
                {contextMenu.node.name}
              </div>
              <ul>
                {[
                  { k: 'expand', label: 'Expand neighbors', icon: '⊕', do: () => expandNeighbors(contextMenu.node.id) },
                  {
                    k: 'pin',
                    label: pinned.has(contextMenu.node.id) ? 'Unpin' : 'Pin position',
                    icon: '⊙',
                    do: () => togglePin(contextMenu.node.id),
                  },
                  { k: 'hide', label: 'Hide node', icon: '◌', do: () => toggleHide(contextMenu.node.id) },
                  {
                    k: 'select',
                    label: selection.has(contextMenu.node.id) ? 'Deselect' : 'Add to selection',
                    icon: '◉',
                    do: () => toggleSelect(contextMenu.node.id),
                  },
                  {
                    k: 'copy',
                    label: 'Copy ID',
                    icon: '⧉',
                    do: async () => {
                      await copyText(contextMenu.node.id);
                      toast.success('ID copied');
                    },
                  },
                  {
                    k: 'open',
                    label: 'Open in Entity Explorer',
                    icon: '↗',
                    do: () => navigate(`/entities?focus=${contextMenu.node.id}`),
                  },
                ].map((item) => (
                  <li key={item.k}>
                    <button
                      type="button"
                      onClick={() => { item.do(); setContextMenu(null); }}
                      className="flex items-center gap-2 w-full px-2 h-7 text-xs hover:bg-bg-hover text-text-secondary hover:text-text-primary"
                    >
                      <span className="w-3 text-text-muted">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  </li>
                ))}
                {openCases.length > 0 && (
                  <>
                    <li className="section-label px-2 py-1 border-t border-border-subtle">ADD TO CASE</li>
                    {openCases.slice(0, 6).map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={async () => { await addSelectionToCase(c.id); setContextMenu(null); }}
                          className="flex items-center gap-2 w-full px-2 h-7 text-xs hover:bg-bg-hover text-text-secondary hover:text-text-primary"
                        >
                          <span className="w-3 text-text-muted">⌬</span>
                          <span className="flex-1 text-left truncate">{c.title}</span>
                        </button>
                      </li>
                    ))}
                  </>
                )}
              </ul>
            </div>
          )}
        </main>

        {/* Right inspector */}
        <Inspector
          className="h-full"
          title={selected?.name || 'Click a node'}
          subtitle={selected?.id}
          onClose={() => setSelected(null)}
        >
          {selected ? (
            <div>
              <KV label="TYPE" value={selected.type} />
              <KV label="COUNTRY" value={selected.country} mono />
              <KV label="RISK" value={<RiskBar score={selected.risk} />} />
              <KV label="DEGREE" value={degree.get(selected.id) ?? 0} mono />
              <div className="flex gap-1 px-2.5 py-2 border-t border-border-subtle">
                <button type="button" className="btn h-6 flex-1" onClick={() => expandNeighbors(selected.id)}>
                  ⊕ EXPAND
                </button>
                <button
                  type="button"
                  className={`btn h-6 flex-1 ${pinned.has(selected.id) ? 'btn-primary' : ''}`}
                  onClick={() => togglePin(selected.id)}
                >
                  ⊙ {pinned.has(selected.id) ? 'UNPIN' : 'PIN'}
                </button>
                <button type="button" className="btn h-6 flex-1" onClick={() => toggleHide(selected.id)}>
                  ◌ HIDE
                </button>
              </div>
              <div className="section-label px-2.5 py-2 border-t border-border-subtle">
                NEIGHBORS · {neighbors.length}
              </div>
              <ul>
                {neighbors.map((n, i) => (
                  <li
                    key={`${n.id}-${i}`}
                    className="px-2.5 py-1 border-b border-border-subtle/60 text-xs flex items-center justify-between hover:bg-bg-hover cursor-pointer"
                    onClick={() => {
                      const target = nodes.find((x) => x.id === n.id);
                      if (target) onSelect(target);
                    }}
                  >
                    <span className="mono text-text-secondary truncate">{n.id}</span>
                    <span className="section-label" style={{ color: KIND_COLOR[n.kind] }}>{n.kind}</span>
                  </li>
                ))}
                {neighbors.length === 0 && (
                  <li className="px-2.5 py-2 text-micro text-text-muted">No neighbors in current view.</li>
                )}
              </ul>
            </div>
          ) : (
            <div className="p-3 text-xs text-text-muted">
              Click a node to inspect. Shift-click to multi-select; right-click for actions.
            </div>
          )}
        </Inspector>
        </Splitter>
        </Splitter>
      </div>

      {showTutorial && <GraphTutorialOverlay onClose={() => setShowTutorial(false)} />}

      {/* Bottom time scrubber */}
      <div className="h-12 flex items-center gap-3 px-3 bg-bg-elevated border-t border-border-subtle flex-shrink-0">
        <span className="section-label">TIME SCRUBBER</span>
        <span className="tabular text-micro text-text-muted w-44">
          edges first-seen ≤ {fmtDateTime(beforeTs)}
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.005"
          value={scrubT}
          onChange={(e) => setScrubT(+e.target.value)}
          className="flex-1 accent-accent-primary"
        />
        <span className="tabular text-micro text-text-muted">{(scrubT * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
