import { useEffect, useMemo, useState } from 'react';
import { Panel, DataTable, FilterChip, Splitter } from '@/components/primitives';
import { Permitted } from '@/components/Permitted';
import { db } from '@/db/schema';
import { fmtDateTime } from '@/lib/format';
import { toCSV, downloadCSV } from '@/lib/csv';
import { audit } from '@/lib/audit';
import { verifyChain } from '@/repo/audit';
import { useAuthStore } from '@/stores/authStore';

const ACTIONS = [
  'login',
  'view_entity',
  'create_role',
  'edit_role',
  'delete_role',
  'export_audit',
  'run_query',
  'open_case',
  'edit_case',
  'close_case',
];

const RANGE_OPTIONS = [
  { key: '15m', label: 'LAST 15M', ms: 15 * 60 * 1000 },
  { key: '1h', label: 'LAST 1H', ms: 60 * 60 * 1000 },
  { key: '24h', label: 'LAST 24H', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: 'LAST 7D', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'ALL', ms: null },
];

const columns = [
  { key: 'ts', label: 'TIMESTAMP', width: 160, mono: true, render: (r) => fmtDateTime(r.ts) },
  { key: 'userId', label: 'OPERATOR', width: 140, mono: true },
  {
    key: 'action',
    label: 'ACTION',
    width: 150,
    render: (r) => <span className="section-label text-viz-violet">{r.action}</span>,
  },
  { key: 'target', label: 'TARGET', width: 160, mono: true, render: (r) => r.target || '—' },
  {
    key: 'details',
    label: 'DETAILS',
    render: (r) => (r.details ? <code className="mono text-text-muted">{JSON.stringify(r.details)}</code> : '—'),
  },
];

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [actionFilter, setActionFilter] = useState(new Set());
  const [range, setRange] = useState('24h');
  const [userFilter, setUserFilter] = useState('');
  const [chainState, setChainState] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const me = useAuthStore((s) => s.user);

  const runVerify = async () => {
    setVerifying(true);
    try {
      const r = await verifyChain();
      setChainState({
        ok: r.tampered == null,
        verified: r.verifiedRows,
        anchor: r.anchorRows,
        tamperedId: r.tampered?.id,
      });
      audit(me?.id, 'verify_audit_chain', null, {
        ok: r.tampered == null,
        verifiedRows: r.verifiedRows,
      });
    } finally {
      setVerifying(false);
    }
  };

  const since = useMemo(() => {
    const opt = RANGE_OPTIONS.find((r) => r.key === range);
    return opt?.ms == null ? 0 : Date.now() - opt.ms;
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await db.audit.orderBy('ts').reverse().limit(5000).toArray();
      const filtered = all.filter((a) => {
        if (a.ts < since) return false;
        if (actionFilter.size && !actionFilter.has(a.action)) return false;
        if (userFilter && !a.userId.toLowerCase().includes(userFilter.toLowerCase())) return false;
        return true;
      });
      if (!cancelled) setRows(filtered);
    })();
    return () => {
      cancelled = true;
    };
  }, [since, actionFilter, userFilter]);

  const toggleAction = (a) =>
    setActionFilter((s) => {
      const next = new Set(s);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });

  const exportNow = async () => {
    const csv = toCSV(rows, [
      { key: 'ts', header: 'timestamp', value: (r) => new Date(r.ts).toISOString() },
      { key: 'userId', header: 'user_id' },
      { key: 'action' },
      { key: 'target' },
      { key: 'details', value: (r) => (r.details ? JSON.stringify(r.details) : '') },
    ]);
    downloadCSV(`atlantis-audit-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    audit(me?.id, 'export_audit', null, { rowCount: rows.length });
  };

  return (
    <div className="h-full flex flex-col bg-bg-base">
      <div className="h-9 flex items-center gap-3 px-2 bg-bg-elevated border-b border-border-subtle flex-shrink-0">
        <span className="section-label">AUDIT LOG</span>
        <div className="flex items-center gap-1">
          {RANGE_OPTIONS.map((r) => (
            <FilterChip
              key={r.key}
              label={r.label}
              active={range === r.key}
              onClick={() => setRange(r.key)}
            />
          ))}
        </div>
        <input
          className="input h-7 w-56"
          placeholder="Filter by operator ID…"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        />
        <div className="flex-1" />
        <span className="tabular text-micro text-text-muted">{rows.length.toLocaleString()} rows</span>
        <button
          type="button"
          className={`btn h-7 ${chainState?.ok ? 'border-accent-success/50 text-accent-success' : ''} ${chainState && !chainState.ok ? 'border-accent-critical/50 text-accent-critical' : ''}`}
          onClick={runVerify}
          disabled={verifying}
          title="Recompute hash chain across audit rows"
        >
          {verifying
            ? 'VERIFYING…'
            : chainState
              ? chainState.ok
                ? `✓ CHAIN OK (${chainState.verified})`
                : `⚠ TAMPERED @${chainState.tamperedId}`
              : '🔒 VERIFY CHAIN'}
        </button>
        <Permitted permission="export_data" fallback={
          <button type="button" disabled className="btn h-7 opacity-40 cursor-not-allowed" title="export_data permission required">
            EXPORT CSV
          </button>
        }>
          <button type="button" className="btn btn-primary h-7" onClick={exportNow}>
            EXPORT CSV
          </button>
        </Permitted>
      </div>

      <div className="flex-1 min-h-0">
        <Splitter id="audit.actions" direction="row" primary="first" initialSize={208} minSize={160} maxSize={360}>
          <aside className="h-full bg-bg-panel border-r border-border-subtle overflow-auto">
            <div className="section-label px-2 py-1.5 border-b border-border-subtle">ACTION</div>
            <div className="p-2 flex flex-wrap gap-1">
              {ACTIONS.map((a) => (
                <FilterChip
                  key={a}
                  label={a}
                  active={actionFilter.has(a)}
                  onClick={() => toggleAction(a)}
                />
              ))}
            </div>
          </aside>

          <main className="h-full min-w-0">
            <Panel className="h-full">
              <DataTable rows={rows} columns={columns} rowKey={(r) => String(r.id)} />
            </Panel>
          </main>
        </Splitter>
      </div>
    </div>
  );
}
