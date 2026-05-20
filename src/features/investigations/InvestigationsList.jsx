import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Panel, DataTable, Modal } from '@/components/primitives';
import { Permitted } from '@/components/Permitted';
import { useDexie } from '@/hooks/useDexie';
import { db } from '@/db/schema';
import { useAuthStore } from '@/stores/authStore';
import { audit } from '@/lib/audit';
import { ulid } from '@/lib/ids';
import { fmtDateTime, fmtRelative } from '@/lib/format';

const STATUS_TONE = {
  open: 'text-accent-primary',
  reviewing: 'text-accent-warning',
  closed: 'text-text-muted',
};

const columns = [
  {
    key: 'status',
    label: 'STATUS',
    width: 110,
    render: (r) => <span className={`section-label ${STATUS_TONE[r.status]}`}>{r.status}</span>,
  },
  {
    key: 'title',
    label: 'TITLE',
    render: (r) => (
      <Link to={`/investigations/${r.id}`} className="text-accent-primary hover:underline">
        {r.title}
      </Link>
    ),
  },
  {
    key: 'entityIds',
    label: 'ENTITIES',
    width: 90,
    mono: true,
    align: 'right',
    render: (r) => (r.entityIds || []).length,
  },
  {
    key: 'progress',
    label: 'PROGRESS',
    width: 120,
    render: (r) => (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-bg-base border border-border-subtle">
          <div className="h-full bg-accent-primary/70" style={{ width: `${r.progress}%` }} />
        </div>
        <span className="tabular text-micro text-text-muted w-8 text-right">{r.progress}%</span>
      </div>
    ),
  },
  { key: 'updatedAt', label: 'UPDATED', width: 140, mono: true, render: (r) => fmtRelative(r.updatedAt) },
  { key: 'createdAt', label: 'CREATED', width: 160, mono: true, render: (r) => fmtDateTime(r.createdAt) },
];

export default function InvestigationsList() {
  const [filter, setFilter] = useState('all');
  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data } = useDexie(
    async () => db.investigations.orderBy('updatedAt').reverse().toArray(),
    [filter],
  );
  const rows = (data ?? []).filter((c) => filter === 'all' || c.status === filter);

  const openNew = () => { setDraft(''); setNewOpen(true); };

  const createCase = async () => {
    if (!draft.trim()) return;
    const id = ulid();
    await db.investigations.put({
      id,
      title: draft.trim(),
      status: 'open',
      ownerId: user?.id ?? 'system',
      entityIds: [],
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    audit(user?.id, 'open_case', id, { title: draft.trim() });
    setNewOpen(false);
    navigate(`/investigations/${id}`);
  };

  return (
    <div className="h-full flex flex-col bg-bg-base">
      <div className="h-9 flex items-center gap-3 px-2 bg-bg-elevated border-b border-border-subtle">
        <span className="section-label">INVESTIGATIONS</span>
        <div className="flex items-center gap-1">
          {['all', 'open', 'reviewing', 'closed'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`chip cursor-pointer ${filter === s ? 'on' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="tabular text-micro text-text-muted">{rows.length} cases</span>
        <Permitted permission="open_investigations">
          <button type="button" className="btn btn-primary h-7" onClick={openNew}>
            + NEW CASE
          </button>
        </Permitted>
      </div>
      <Panel className="flex-1">
        <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />
      </Panel>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="NEW CASE"
        size="sm"
        footer={
          <>
            <button type="button" className="btn h-7" onClick={() => setNewOpen(false)}>CANCEL</button>
            <button type="button" className="btn btn-primary h-7" onClick={createCase} disabled={!draft.trim()}>CREATE</button>
          </>
        }
      >
        <div className="p-4 space-y-2">
          <label className="section-label block">CASE TITLE</label>
          <input
            ref={inputRef}
            autoFocus
            className="input w-full"
            placeholder="e.g. Suspicious wire cluster — ACME Corp"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createCase()}
          />
        </div>
      </Modal>
    </div>
  );
}
