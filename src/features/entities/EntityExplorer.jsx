import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Panel, DataTable, FilterChip, Inspector, KV, RiskBar, Splitter, TableRowSkeleton } from '@/components/primitives';
import { ChipQueryInput } from '@/components/ChipQueryInput';
import { Permitted } from '@/components/Permitted';
import { useQueryEntities } from '@/hooks/useQueryEntities';
import { useDexie } from '@/hooks/useDexie';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { audit } from '@/lib/audit';
import { db } from '@/db/schema';
import { ulid } from '@/lib/ids';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { toCSV, downloadCSV } from '@/lib/csv';

const QUICK_FACETS = [
  { label: 'High risk', value: 'risk:>80' },
  { label: 'Sanctioned', value: 'tag:sanctioned' },
  { label: 'High-risk jurisdiction', value: 'country:RU,CY,PA,KY,NG' },
  { label: 'Shell companies', value: 'type:organization tag:shell-company' },
  { label: 'PEP persons', value: 'type:person tag:pep' },
];

const columns = [
  { key: 'id', label: 'ID', width: 110, mono: true },
  { key: 'type', label: 'TYPE', width: 70, render: (r) => (
      <span className="section-label text-viz-cyan">{r.type}</span>
    ) },
  { key: 'name', label: 'NAME', width: 220 },
  { key: 'country', label: 'CC', width: 38, mono: true, align: 'center' },
  { key: 'riskScore', label: 'RISK', width: 96, render: (r) => <RiskBar score={r.riskScore} /> },
  { key: 'tags', label: 'TAGS', width: 220, render: (r) => (
      <span className="flex gap-1 flex-wrap">
        {(r.tags || []).slice(0, 3).map((t) => (
          <span key={t} className="chip">{t}</span>
        ))}
      </span>
    ) },
  { key: 'createdAt', label: 'CREATED', width: 150, mono: true, render: (r) => fmtDateTime(r.createdAt) },
  { key: 'updatedAt', label: 'UPDATED', width: 150, mono: true, render: (r) => fmtDateTime(r.updatedAt) },
];

export default function EntityExplorer() {
  const [params] = useSearchParams();
  const seedQuery = params.get('seedQuery');
  const focusId = params.get('focus');
  const [query, setQuery] = useState(seedQuery || (focusId ? `id:${focusId}` : ''));
  const [selected, setSelected] = useState(null);
  const inspectorOpen = useUIStore((s) => s.rightInspectorOpen);
  const user = useAuthStore((s) => s.user);
  const { rows, loading, errors } = useQueryEntities(query, { limit: 1000 });

  // When deep-linked with ?focus=ID, open the inspector on that row once results land.
  useEffect(() => {
    if (!focusId || !rows.length) return;
    const row = rows.find((r) => r.id === focusId.toUpperCase());
    if (row && (!selected || selected.id !== row.id)) {
      setSelected(row);
      audit(user?.id, 'view_entity', row.id, { from: 'deep_link' });
    }
  }, [focusId, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: saved } = useDexie(
    async () => db.savedQueries.orderBy('createdAt').reverse().toArray(),
    [query],
  );

  const selectRow = (row) => {
    setSelected(row);
    audit(user?.id, 'view_entity', row.id);
  };

  const runQuery = () => {
    audit(user?.id, 'run_query', null, { q: query, resultCount: rows.length });
  };

  const saveQuery = async () => {
    const name = prompt('Name this saved query:');
    if (!name) return;
    await db.savedQueries.put({ id: ulid(), name, query, createdAt: Date.now() });
    audit(user?.id, 'save_query', name, { query });
  };

  const exportRows = () => {
    const csv = toCSV(rows, [
      { key: 'id' },
      { key: 'type' },
      { key: 'name' },
      { key: 'country' },
      { key: 'riskScore', header: 'risk' },
      { key: 'tags', value: (r) => (r.tags || []).join('|') },
    ]);
    downloadCSV(`atlantis-entities-${Date.now()}.csv`, csv);
    audit(user?.id, 'export_entities', null, { count: rows.length, query });
  };

  const { data: events } = useDexie(
    async () =>
      selected
        ? db.events.where('entityId').equals(selected.id).reverse().sortBy('ts').then((r) => r.slice(0, 10))
        : [],
    [selected?.id],
  );

  const facets = (
    <aside className="h-full bg-bg-panel border-r border-border-subtle overflow-auto">
      <div className="section-label px-2 py-1.5 border-b border-border-subtle">QUICK FACETS</div>
      <div className="p-2 flex flex-col gap-1">
        {QUICK_FACETS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setQuery((q) => (q ? `${q} ${f.value}` : f.value))}
            className="btn justify-start h-6 text-left"
          >
            <span className="truncate">{f.label}</span>
          </button>
        ))}
      </div>

      <div className="section-label px-2 py-1.5 border-y border-border-subtle">SAVED QUERIES</div>
      <ul className="p-1">
        {(saved ?? []).map((s) => (
          <li
            key={s.id}
            className="group flex items-center justify-between px-1.5 py-1 hover:bg-bg-hover cursor-pointer"
            onClick={() => setQuery(s.query)}
          >
            <span className="text-xs truncate">{s.name}</span>
            <button
              type="button"
              aria-label={`Delete ${s.name}`}
              onClick={async (e) => {
                e.stopPropagation();
                await db.savedQueries.delete(s.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-critical"
            >
              ×
            </button>
          </li>
        ))}
        {(saved || []).length === 0 && (
          <li className="px-2 py-2 text-micro text-text-muted">No saved queries yet.</li>
        )}
      </ul>
    </aside>
  );

  const main = (
    <main className="h-full flex flex-col min-w-0">
      <div className="h-9 flex items-center gap-2 px-2 bg-bg-elevated border-b border-border-subtle flex-shrink-0">
        <ChipQueryInput value={query} onChange={setQuery} onSubmit={runQuery} />
        <button type="button" className="btn h-7" onClick={saveQuery} disabled={!query}>
          ★ SAVE
        </button>
        <Permitted permission="export_data">
          <button type="button" className="btn h-7" onClick={exportRows} disabled={!rows.length}>
            CSV
          </button>
        </Permitted>
        <span className="tabular text-micro text-text-muted whitespace-nowrap">
          {loading ? 'querying…' : `${rows.length.toLocaleString()} rows`}
        </span>
      </div>

      {errors.length === 0 ? null : (
        <div className="px-2 py-1 bg-accent-critical/10 border-b border-accent-critical/30 text-micro text-accent-critical">
          {errors.join(' · ')}
        </div>
      )}

      <Panel className="flex-1 min-h-0 relative">
        {loading && rows.length === 0 ? (
          <div className="h-full overflow-hidden">
            <div className="h-7 bg-bg-elevated border-b border-border-subtle flex items-center gap-3 px-2">
              {['w-20', 'w-14', 'w-36', 'w-8', 'w-24', 'w-32', 'w-24', 'w-24'].map((w, i) => (
                <div key={i} className={`h-2 bg-bg-hover rounded-xs ${w} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-scan" />
                </div>
              ))}
            </div>
            {Array.from({ length: 18 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={8} />
            ))}
          </div>
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            onRowClick={selectRow}
            selectedKey={selected?.id}
          />
        )}
        {loading && rows.length > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-bg-elevated border border-border-subtle px-2 py-1 text-micro text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-pulseDot" />
            querying…
          </div>
        )}
      </Panel>
    </main>
  );

  const inspector = (
    <Inspector
      className="h-full"
      title={selected?.name || 'Select an entity'}
      subtitle={selected?.id}
      onClose={() => setSelected(null)}
    >
      {selected ? (
        <div>
          <KV label="TYPE" value={selected.type} />
          <KV label="COUNTRY" value={selected.country} mono />
          <KV label="RISK" value={<RiskBar score={selected.riskScore} />} />
          <KV label="CREATED" value={fmtDateTime(selected.createdAt)} mono />
          <KV label="UPDATED" value={fmtDateTime(selected.updatedAt)} mono />
          {Object.entries(selected.attrs || {}).map(([k, v]) => (
            <KV
              key={k}
              label={k.toUpperCase()}
              mono
              value={typeof v === 'number' && k.toLowerCase().includes('amount') ? fmtMoney(v) : String(v)}
            />
          ))}
          <div className="section-label px-2.5 py-2 border-t border-border-subtle">
            RECENT EVENTS
          </div>
          <ul>
            {(events || []).map((e) => (
              <li key={e.id} className="px-2.5 py-1 border-b border-border-subtle/60 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>{e.description}</span>
                  <span className="tabular text-text-muted">{fmtDateTime(e.ts)}</span>
                </div>
              </li>
            ))}
            {(!events || events.length === 0) && (
              <li className="px-2.5 py-2 text-micro text-text-muted">No related events.</li>
            )}
          </ul>
        </div>
      ) : (
        <div className="p-3 text-xs text-text-muted">
          Click a row to inspect details and timeline.
        </div>
      )}
    </Inspector>
  );

  return (
    <div className="h-full w-full bg-bg-base">
      <Splitter id="explorer.facets" direction="row" primary="first" initialSize={224} minSize={160} maxSize={420}>
        {facets}
        {inspectorOpen ? (
          <Splitter id="explorer.inspector" direction="row" primary="second" initialSize={320} minSize={240} maxSize={520}>
            {main}
            {inspector}
          </Splitter>
        ) : (
          main
        )}
      </Splitter>
    </div>
  );
}
