import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Panel, RiskBar, Splitter } from '@/components/primitives';
import { Permitted } from '@/components/Permitted';
import { useDexie } from '@/hooks/useDexie';
import { db } from '@/db/schema';
import { useAuthStore } from '@/stores/authStore';
import { audit } from '@/lib/audit';
import { ulid } from '@/lib/ids';
import { fmtDateTime, fmtRelative } from '@/lib/format';

const STATUSES = ['open', 'reviewing', 'closed'];

/**
 * Three-column case workspace.
 *   Left:   entities pinned to this case
 *   Center: notes timeline + status / progress controls
 *   Right:  evidence (event references)
 */
export default function InvestigationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const { data: cse } = useDexie(async () => db.investigations.get(id), [id, tick]);
  const { data: notes } = useDexie(
    async () => db.caseNotes.where('caseId').equals(id).reverse().sortBy('createdAt'),
    [id, tick],
  );
  const { data: evidence } = useDexie(
    async () => db.caseEvidence.where('caseId').equals(id).reverse().sortBy('createdAt'),
    [id, tick],
  );
  const { data: entities } = useDexie(async () => {
    if (!cse?.entityIds?.length) return [];
    return db.entities.where('id').anyOf(cse.entityIds).toArray();
  }, [id, cse?.entityIds?.join('|') || '']);

  const [noteDraft, setNoteDraft] = useState('');
  const [addId, setAddId] = useState('');
  const [addErr, setAddErr] = useState('');

  if (!cse) {
    return <div className="h-full grid place-items-center text-xs text-text-muted">Loading case…</div>;
  }

  const updateCase = async (patch) => {
    await db.investigations.update(id, { ...patch, updatedAt: Date.now() });
    audit(user?.id, 'edit_case', id, patch);
    refresh();
  };

  const addNote = async () => {
    if (!noteDraft.trim()) return;
    await db.caseNotes.put({
      id: ulid(),
      caseId: id,
      body: noteDraft.trim(),
      authorId: user?.id ?? 'system',
      createdAt: Date.now(),
    });
    audit(user?.id, 'edit_case', id, { note: noteDraft.length });
    setNoteDraft('');
    await updateCase({});
    refresh();
  };

  const addEntity = async () => {
    if (!addId.trim()) return;
    const upper = addId.trim().toUpperCase();
    const ent = await db.entities.get(upper);
    if (!ent) {
      setAddErr(`No entity: ${upper}`);
      return;
    }
    if (cse.entityIds?.includes(upper)) {
      setAddId('');
      setAddErr('');
      return;
    }
    await updateCase({ entityIds: [...(cse.entityIds || []), upper] });
    setAddId('');
    setAddErr('');
  };

  const removeEntity = async (eid) => {
    await updateCase({ entityIds: (cse.entityIds || []).filter((x) => x !== eid) });
  };

  const addEvidenceForLastEvent = async () => {
    const recent = await db.events.orderBy('ts').reverse().limit(1).first();
    if (!recent) return;
    await db.caseEvidence.put({
      id: ulid(),
      caseId: id,
      kind: 'event',
      ref: recent.id,
      summary: recent.description,
      ts: recent.ts,
      createdAt: Date.now(),
    });
    audit(user?.id, 'edit_case', id, { evidenceAdded: recent.id });
    refresh();
  };

  return (
    <div className="h-full flex flex-col bg-bg-base">
      {/* Top bar: case status, progress, collaborators */}
      <div className="h-10 flex items-center gap-3 px-2 bg-bg-elevated border-b border-border-emphasis flex-shrink-0">
        <Link to="/investigations" className="text-text-muted hover:text-text-primary text-xs">
          ←
        </Link>
        <span className="section-label">CASE</span>
        <span className="text-sm font-medium text-text-primary truncate">{cse.title}</span>
        <span className="mono text-micro text-text-muted">{cse.id}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateCase({ status: s })}
              className={`chip cursor-pointer ${cse.status === s ? 'on' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="section-label">PROGRESS</span>
          <input
            type="range"
            min="0"
            max="100"
            value={cse.progress ?? 0}
            onChange={(e) => updateCase({ progress: +e.target.value })}
            className="accent-accent-primary w-32"
          />
          <span className="tabular text-micro text-text-secondary w-8 text-right">
            {cse.progress}%
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Splitter id="case.entities" direction="row" primary="first" initialSize={288} minSize={220} maxSize={420}>
        {/* LEFT — entities in case */}
        <aside className="h-full bg-bg-panel border-r border-border-subtle flex flex-col">
          <div className="section-label px-2 py-1.5 border-b border-border-subtle">
            ENTITIES · {(entities ?? []).length}
          </div>
          <div className="px-2 py-1.5 border-b border-border-subtle flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <input
                className="input h-6 flex-1"
                placeholder="Add by ID (E000…)"
                value={addId}
                onChange={(e) => { setAddId(e.target.value); setAddErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && addEntity()}
              />
              <button type="button" className="btn btn-primary h-6" onClick={addEntity}>
                +
              </button>
            </div>
            {addErr && <span className="text-micro text-accent-critical">{addErr}</span>}
          </div>
          <ul className="flex-1 overflow-auto">
            {(entities ?? []).map((e) => (
              <li
                key={e.id}
                className="group px-2 py-1.5 border-b border-border-subtle/50 hover:bg-bg-hover"
              >
                <div className="flex items-center gap-2">
                  <span className="section-label text-viz-cyan">{e.type}</span>
                  <span className="text-xs text-text-primary flex-1 truncate">{e.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${e.id}`}
                    onClick={() => removeEntity(e.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-critical"
                  >
                    ×
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="mono text-micro text-text-faint truncate">{e.id}</span>
                  <RiskBar score={e.riskScore} />
                </div>
              </li>
            ))}
            {(entities ?? []).length === 0 && (
              <li className="px-2 py-3 text-micro text-text-muted text-center">
                No entities yet. Add one by ID.
              </li>
            )}
          </ul>
        </aside>

        <Splitter id="case.evidence" direction="row" primary="second" initialSize={288} minSize={220} maxSize={420}>
        {/* CENTER — notes / canvas */}
        <main className="h-full min-w-0 flex flex-col">
          <Panel className="flex-1 min-h-0 flex flex-col">
            <div className="section-label px-2.5 py-1.5 border-b border-border-subtle">
              CASE NOTES · {(notes ?? []).length}
            </div>
            <ul className="flex-1 overflow-auto">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="px-3 py-2 border-b border-border-subtle/60">
                  <div className="flex items-center justify-between">
                    <span className="mono text-micro text-text-muted">{n.authorId}</span>
                    <span className="mono text-micro text-text-muted">{fmtRelative(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-text-primary mt-1 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
              {(notes ?? []).length === 0 && (
                <li className="px-3 py-6 text-micro text-text-muted text-center">
                  No notes yet. Draft your first observation below.
                </li>
              )}
            </ul>
            <div className="border-t border-border-subtle p-2 flex gap-2">
              <textarea
                className="input flex-1 h-16 resize-none"
                placeholder="Draft a note on this case…"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') addNote();
                }}
              />
              <Permitted permission="open_investigations">
                <button type="button" className="btn btn-primary self-end" onClick={addNote}>
                  POST <kbd className="ml-1 tabular text-micro">⌘↵</kbd>
                </button>
              </Permitted>
            </div>
          </Panel>
        </main>

        {/* RIGHT — evidence */}
        <aside className="h-full bg-bg-panel border-l border-border-subtle flex flex-col">
          <div className="section-label px-2 py-1.5 border-b border-border-subtle flex items-center justify-between">
            <span>EVIDENCE · {(evidence ?? []).length}</span>
            <button
              type="button"
              className="btn h-6 px-2"
              onClick={addEvidenceForLastEvent}
              title="Pin the most recent live event as evidence"
            >
              + PIN LAST EVENT
            </button>
          </div>
          <ul className="flex-1 overflow-auto">
            {(evidence ?? []).map((ev) => (
              <li key={ev.id} className="px-2 py-1.5 border-b border-border-subtle/60">
                <div className="flex items-center justify-between">
                  <span className="section-label text-viz-magenta">{ev.kind}</span>
                  <span className="mono text-micro text-text-muted">{fmtDateTime(ev.ts)}</span>
                </div>
                <div className="text-xs text-text-primary truncate">{ev.summary}</div>
                <div className="mono text-micro text-text-faint">{ev.ref}</div>
              </li>
            ))}
            {(evidence ?? []).length === 0 && (
              <li className="px-2 py-3 text-micro text-text-muted text-center">
                No evidence pinned.
              </li>
            )}
          </ul>
        </aside>
        </Splitter>
        </Splitter>
      </div>
    </div>
  );
}
