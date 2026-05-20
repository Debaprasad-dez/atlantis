import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tile, Modal, FilterChip, KV } from '@/components/primitives';
import { useLiveStore } from '@/stores/liveStore';
import { fmtTime, fmtMoney, fmtDateTime } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';
import { copyText } from '@/lib/clipboard';
import { toCSV, downloadCSV } from '@/lib/csv';
import { toast } from '@/stores/toastStore';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';

const SEV_COLOR = {
  info: 'text-text-secondary',
  warning: 'text-accent-warning',
  critical: 'text-accent-critical',
};
const SEV_DOT = {
  info: 'bg-text-faint',
  warning: 'bg-accent-warning',
  critical: 'bg-accent-critical',
};

/** Live event feed with pause/resume, severity quick-filter, click-to-inspect, and menu actions. */
export function LiveEventFeed({ span }) {
  const navigate = useNavigate();
  const feed = useLiveStore((s) => s.feed);
  const paused = useLiveStore((s) => s.paused);
  const togglePaused = useLiveStore((s) => s.togglePaused);
  const user = useAuthStore((s) => s.user);

  const [severity, setSeverity] = useState(new Set(['info', 'warning', 'critical']));
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => feed.filter((e) => severity.has(e.severity)).slice(0, 80), [feed, severity]);

  const toggleSev = (s) =>
    setSeverity((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      // Always keep at least one
      return next.size === 0 ? new Set([s]) : next;
    });

  const copyVisible = async () => {
    const ok = await copyText(JSON.stringify(filtered, null, 2));
    ok ? toast.success(`Copied ${filtered.length} events`) : toast.warning('Copy failed');
  };

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { key: 'ts', header: 'timestamp', value: (r) => new Date(r.ts).toISOString() },
      { key: 'kind' },
      { key: 'severity' },
      { key: 'entityId' },
      { key: 'counterpartyId' },
      { key: 'amount' },
      { key: 'description' },
    ]);
    downloadCSV(`atlantis-feed-${Date.now()}.csv`, csv);
    audit(user?.id, 'export_feed', null, { count: filtered.length });
  };

  return (
    <>
      <Tile
        title="LIVE EVENT FEED"
        live={!paused}
        span={span}
        footer={paused ? `${feed.length} buffered · PAUSED` : `${feed.length} buffered`}
        actions={
          <button
            type="button"
            onClick={togglePaused}
            className="text-text-muted hover:text-text-primary text-xs px-1"
            title={paused ? 'Resume live updates' : 'Pause live updates'}
            aria-label={paused ? 'Resume' : 'Pause'}
          >
            {paused ? '▶' : '⏸'}
          </button>
        }
        menuItems={[
          { key: 'pause', label: paused ? 'Resume stream' : 'Pause stream', icon: paused ? '▶' : '⏸', onSelect: togglePaused },
          { key: 'copy', label: `Copy visible (${filtered.length})`, icon: '⧉', onSelect: copyVisible },
          { key: 'export', label: 'Export CSV', icon: '↧', onSelect: exportCSV },
          { key: 'clear', label: 'Clear feed', icon: '⌫', danger: true, onSelect: () => useLiveStore.setState({ feed: [] }) },
        ]}
      >
        <div className="flex items-center gap-1 px-2 py-1 border-b border-border-subtle/60 bg-bg-elevated/60">
          {['info', 'warning', 'critical'].map((s) => (
            <FilterChip key={s} label={s.toUpperCase()} active={severity.has(s)} onClick={() => toggleSev(s)} />
          ))}
        </div>
        <ul className="h-full overflow-auto">
          <AnimatePresence initial={false}>
            {filtered.map((e) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                onClick={() => setSelected(e)}
                className="flex items-center gap-2 px-2 h-5 text-xs border-b border-border-subtle/40 hover:bg-bg-hover cursor-pointer"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${SEV_DOT[e.severity]}`} />
                <span className="tabular text-text-muted w-16 flex-shrink-0">{fmtTime(e.ts)}</span>
                <span className="section-label text-viz-cyan w-14 flex-shrink-0">{e.kind}</span>
                <span className={`flex-1 truncate ${SEV_COLOR[e.severity]}`}>{e.description}</span>
                {e.amount != null ? (
                  <span className="tabular text-text-secondary w-20 text-right flex-shrink-0">
                    {fmtMoney(e.amount, e.currency)}
                  </span>
                ) : null}
                <span className="tabular text-micro text-text-faint w-20 text-right truncate flex-shrink-0">
                  {e.entityId}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Tile>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="EVENT DETAIL" size="md">
        {selected ? (
          <div className="p-3 text-xs">
            <KV label="ID" value={selected.id} mono />
            <KV label="TIMESTAMP" value={fmtDateTime(selected.ts)} mono />
            <KV label="KIND" value={selected.kind} />
            <KV label="SEVERITY" value={selected.severity} />
            <KV label="DESCRIPTION" value={selected.description} />
            <KV label="ENTITY" value={selected.entityId} mono />
            {selected.counterpartyId ? <KV label="COUNTERPARTY" value={selected.counterpartyId} mono /> : null}
            {selected.amount != null ? <KV label="AMOUNT" value={fmtMoney(selected.amount, selected.currency)} mono /> : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  const ok = await copyText(JSON.stringify(selected, null, 2));
                  ok ? toast.success('Event JSON copied') : toast.warning('Copy failed');
                }}
              >
                COPY JSON
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSelected(null);
                  navigate(`/entities?focus=${selected.entityId}`);
                }}
              >
                OPEN ENTITY →
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
