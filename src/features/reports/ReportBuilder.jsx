import { useEffect, useMemo, useState } from 'react';
import { Panel, RiskBar, Splitter } from '@/components/primitives';
import { db } from '@/db/schema';
import { ulid } from '@/lib/ids';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';
import { compileQuery } from '@/lib/query';
import { fmtDateTime } from '@/lib/format';
import { toCSV, downloadCSV } from '@/lib/csv';
import { toast } from '@/stores/toastStore';

const SECTION_TYPES = [
  { key: 'cover', label: 'Cover page', defaults: { title: 'Untitled Report', subtitle: '' } },
  { key: 'metrics', label: 'KPI metrics', defaults: { kpis: ['entities', 'anomalies', 'cases'] } },
  { key: 'query', label: 'Query results', defaults: { query: 'risk:>80', limit: 25 } },
  { key: 'anomalies', label: 'Anomaly summary', defaults: { limit: 20 } },
  { key: 'cases', label: 'Investigation summary', defaults: { status: 'open' } },
  { key: 'notes', label: 'Free-form notes', defaults: { body: '' } },
];

const blank = () => ({
  id: ulid(),
  name: 'New report',
  sections: [
    { id: ulid(), type: 'cover', config: { title: 'Untitled Report', subtitle: '' } },
    { id: ulid(), type: 'metrics', config: { kpis: ['entities', 'anomalies', 'cases'] } },
  ],
  updatedAt: Date.now(),
});

export default function ReportBuilder() {
  const user = useAuthStore((s) => s.user);
  const [report, setReport] = useState(blank);
  const [saved, setSaved] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);

  useEffect(() => {
    db.reports.orderBy('updatedAt').reverse().toArray().then(setSaved);
  }, []);

  const addSection = (type) => {
    const tdef = SECTION_TYPES.find((t) => t.key === type);
    setReport((r) => ({
      ...r,
      sections: [...r.sections, { id: ulid(), type, config: { ...tdef.defaults } }],
      updatedAt: Date.now(),
    }));
  };

  const removeSection = (id) => {
    setReport((r) => ({ ...r, sections: r.sections.filter((s) => s.id !== id) }));
  };

  const moveSection = (id, dir) => {
    setReport((r) => {
      const i = r.sections.findIndex((s) => s.id === id);
      if (i < 0) return r;
      const j = i + dir;
      if (j < 0 || j >= r.sections.length) return r;
      const next = [...r.sections];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...r, sections: next };
    });
  };

  const updateSection = (id, patch) =>
    setReport((r) => ({
      ...r,
      sections: r.sections.map((s) => (s.id === id ? { ...s, config: { ...s.config, ...patch } } : s)),
      updatedAt: Date.now(),
    }));

  const saveReport = async () => {
    await db.reports.put({ ...report, updatedAt: Date.now() });
    audit(user?.id, 'save_report', report.id, { sections: report.sections.length });
    const all = await db.reports.orderBy('updatedAt').reverse().toArray();
    setSaved(all);
    toast.success(`Saved "${report.name}"`);
  };

  const loadReport = (r) => setReport({ ...r });
  const newReport = () => setReport(blank());
  const deleteReport = async (id) => {
    if (!confirm('Delete this report?')) return;
    await db.reports.delete(id);
    setSaved((s) => s.filter((r) => r.id !== id));
  };

  const printNow = () => {
    audit(user?.id, 'print_report', report.id, { sections: report.sections.length });
    window.print();
  };

  return (
    <div className="h-full flex flex-col bg-bg-base">
      <div className="h-9 flex items-center gap-3 px-2 bg-bg-elevated border-b border-border-subtle print:hidden">
        <span className="section-label">REPORT BUILDER</span>
        <input
          className="input h-7 w-72"
          value={report.name}
          onChange={(e) => setReport((r) => ({ ...r, name: e.target.value }))}
        />
        <span className="tabular text-micro text-text-muted">{report.sections.length} sections</span>
        <div className="flex-1" />
        <button type="button" className="btn h-7" onClick={newReport}>+ NEW</button>
        <button type="button" className="btn h-7" onClick={saveReport}>★ SAVE</button>
        <button type="button" className="btn h-7 btn-primary" onClick={printNow} title="Use browser Save-as-PDF">
          ↧ EXPORT PDF
        </button>
      </div>

      <div className="flex-1 min-h-0 print:block print:overflow-visible">
        <Splitter id="report.outline" direction="row" primary="first" initialSize={240} minSize={200} maxSize={360}>
        {/* Left: outline / palette */}
        <aside className="h-full bg-bg-panel border-r border-border-subtle overflow-auto print:hidden">
          <div className="section-label px-2 py-1.5 border-b border-border-subtle">SECTIONS</div>
          <ul>
            {report.sections.map((s, i) => (
              <li
                key={s.id}
                onClick={() => setSelectedSection(s.id)}
                className={`px-2 py-1.5 border-b border-border-subtle/50 cursor-pointer flex items-center gap-1 ${
                  selectedSection === s.id ? 'bg-accent-primary/10' : 'hover:bg-bg-hover'
                }`}
              >
                <span className="tabular text-micro text-text-muted w-5">{i + 1}.</span>
                <span className="text-xs flex-1 truncate">{SECTION_TYPES.find((t) => t.key === s.type)?.label || s.type}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); moveSection(s.id, -1); }}
                  className="text-text-muted hover:text-text-primary"
                  aria-label="Move up"
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); moveSection(s.id, 1); }}
                  className="text-text-muted hover:text-text-primary"
                  aria-label="Move down"
                  disabled={i === report.sections.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeSection(s.id); }}
                  className="text-text-muted hover:text-accent-critical"
                  aria-label="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="section-label px-2 py-1.5 border-y border-border-subtle">ADD SECTION</div>
          <div className="p-2 flex flex-col gap-1">
            {SECTION_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => addSection(t.key)}
                className="btn justify-start h-6"
              >
                + {t.label}
              </button>
            ))}
          </div>

          <div className="section-label px-2 py-1.5 border-y border-border-subtle">SAVED REPORTS</div>
          <ul>
            {saved.map((r) => (
              <li key={r.id} className="group flex items-center px-2 py-1.5 hover:bg-bg-hover">
                <button type="button" onClick={() => loadReport(r)} className="flex-1 text-left text-xs truncate">
                  {r.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteReport(r.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-critical"
                >
                  ×
                </button>
              </li>
            ))}
            {saved.length === 0 && <li className="px-2 py-2 text-micro text-text-muted">No saved reports.</li>}
          </ul>
        </aside>

        <Splitter id="report.editor" direction="row" primary="second" initialSize={288} minSize={240} maxSize={420}>
        {/* Center: preview canvas */}
        <main className="h-full min-w-0 overflow-auto p-4 print:p-0">
          <div className="max-w-[820px] mx-auto space-y-3">
            {report.sections.map((s) => (
              <SectionRenderer
                key={s.id}
                section={s}
                selected={selectedSection === s.id}
                onSelect={() => setSelectedSection(s.id)}
              />
            ))}
            {report.sections.length === 0 && (
              <div className="text-center text-text-muted py-12">
                No sections — add one from the left panel.
              </div>
            )}
          </div>
        </main>

        {/* Right: section editor */}
        <aside className="h-full bg-bg-panel border-l border-border-subtle overflow-auto print:hidden">
          {(() => {
            const s = report.sections.find((x) => x.id === selectedSection);
            if (!s) {
              return (
                <div className="p-3 text-xs text-text-muted">
                  Click a section on the canvas to edit it.
                </div>
              );
            }
            const tdef = SECTION_TYPES.find((t) => t.key === s.type);
            return (
              <div>
                <div className="section-label px-2 py-1.5 border-b border-border-subtle">
                  {tdef.label.toUpperCase()}
                </div>
                <SectionEditor section={s} onChange={(patch) => updateSection(s.id, patch)} />
              </div>
            );
          })()}
        </aside>
        </Splitter>
        </Splitter>
      </div>
    </div>
  );
}

function SectionRenderer({ section, selected, onSelect }) {
  const cls = `border ${selected ? 'border-accent-primary' : 'border-border-subtle'} bg-bg-panel print:border-0 print:bg-white print:text-black`;
  switch (section.type) {
    case 'cover':
      return (
        <section className={`${cls} p-8 text-center`} onClick={onSelect}>
          <h1 className="text-2xl font-semibold tracking-wide text-text-primary print:text-black">
            {section.config.title || 'Untitled Report'}
          </h1>
          {section.config.subtitle ? (
            <p className="mt-2 text-sm text-text-secondary print:text-gray-600">
              {section.config.subtitle}
            </p>
          ) : null}
          <p className="mt-6 mono text-micro text-text-muted">
            Generated {fmtDateTime(Date.now())}
          </p>
        </section>
      );
    case 'metrics':
      return <MetricsSection section={section} onSelect={onSelect} cls={cls} />;
    case 'query':
      return <QuerySection section={section} onSelect={onSelect} cls={cls} />;
    case 'anomalies':
      return <AnomaliesSection section={section} onSelect={onSelect} cls={cls} />;
    case 'cases':
      return <CasesSection section={section} onSelect={onSelect} cls={cls} />;
    case 'notes':
      return (
        <section className={`${cls} p-4`} onClick={onSelect}>
          <div className="section-label mb-2">NOTES</div>
          <p className="text-sm text-text-secondary whitespace-pre-wrap print:text-black">
            {section.config.body || <em className="text-text-muted">(empty)</em>}
          </p>
        </section>
      );
    default:
      return null;
  }
}

function MetricsSection({ section, onSelect, cls }) {
  const [counts, setCounts] = useState({ entities: 0, anomalies: 0, cases: 0 });
  useEffect(() => {
    Promise.all([
      db.entities.count(),
      db.anomalies.count(),
      db.investigations.count(),
    ]).then(([e, a, c]) => setCounts({ entities: e, anomalies: a, cases: c }));
  }, []);
  return (
    <section className={`${cls} p-4`} onClick={onSelect}>
      <div className="section-label mb-2">KPIs</div>
      <div className="grid grid-cols-3 gap-2">
        {section.config.kpis.map((k) => (
          <div key={k} className="border border-border-subtle p-3 print:border-gray-300">
            <div className="section-label">{k.toUpperCase()}</div>
            <div className="tabular text-2xl text-accent-primary mt-1 print:text-black">
              {counts[k]?.toLocaleString() ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuerySection({ section, onSelect, cls }) {
  const [rows, setRows] = useState([]);
  const q = section.config.query || '';
  const limit = section.config.limit ?? 25;
  useEffect(() => {
    let cancelled = false;
    const { predicate } = compileQuery(q);
    const out = [];
    db.entities
      .orderBy('riskScore')
      .reverse()
      .until(() => out.length >= limit)
      .each((e) => {
        if (predicate(e)) out.push(e);
      })
      .then(() => !cancelled && setRows(out));
    return () => {
      cancelled = true;
    };
  }, [q, limit]);
  return (
    <section className={`${cls} p-4`} onClick={onSelect}>
      <div className="flex justify-between items-center mb-2">
        <div className="section-label">QUERY · {q || '(none)'}</div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const csv = toCSV(rows, [{ key: 'id' }, { key: 'type' }, { key: 'name' }, { key: 'country' }, { key: 'riskScore' }]);
            downloadCSV(`report-query-${Date.now()}.csv`, csv);
          }}
          className="btn h-6 print:hidden"
        >
          ↧ CSV
        </button>
      </div>
      <table className="w-full text-xs">
        <thead className="text-micro uppercase text-text-muted">
          <tr><th className="text-left p-1">ID</th><th>TYPE</th><th>NAME</th><th>CC</th><th className="w-32">RISK</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border-subtle/50">
              <td className="mono py-1 px-1">{r.id}</td>
              <td className="text-viz-cyan">{r.type}</td>
              <td>{r.name}</td>
              <td className="mono">{r.country}</td>
              <td><RiskBar score={r.riskScore} /></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan="5" className="text-center text-text-muted py-2">No matches.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function AnomaliesSection({ section, onSelect, cls }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    db.anomalies.orderBy('detectedAt').reverse().limit(section.config.limit ?? 20).toArray().then(setRows);
  }, [section.config.limit]);
  return (
    <section className={`${cls} p-4`} onClick={onSelect}>
      <div className="section-label mb-2">ANOMALIES</div>
      <ul className="text-xs">
        {rows.map((a) => (
          <li key={a.id} className="border-t border-border-subtle/50 py-1 flex items-center gap-2">
            <span className={`section-label ${a.severity === 'critical' ? 'text-accent-critical' : 'text-accent-warning'} w-16`}>
              {a.severity}
            </span>
            <span className="flex-1">{a.reason}</span>
            <span className="mono text-text-muted">{a.entityId}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CasesSection({ section, onSelect, cls }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const q = section.config.status
      ? db.investigations.where('status').equals(section.config.status)
      : db.investigations;
    q.toArray().then((all) => setRows(all.sort((a, b) => b.updatedAt - a.updatedAt)));
  }, [section.config.status]);
  return (
    <section className={`${cls} p-4`} onClick={onSelect}>
      <div className="section-label mb-2">INVESTIGATIONS · {section.config.status || 'ALL'}</div>
      <ul className="text-xs">
        {rows.map((c) => (
          <li key={c.id} className="border-t border-border-subtle/50 py-1 flex items-center gap-2">
            <span className="section-label w-16">{c.status}</span>
            <span className="flex-1">{c.title}</span>
            <span className="tabular text-text-muted">{c.progress}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionEditor({ section, onChange }) {
  switch (section.type) {
    case 'cover':
      return (
        <div className="p-2 space-y-2">
          <label className="section-label block">TITLE</label>
          <input className="input" value={section.config.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
          <label className="section-label block mt-2">SUBTITLE</label>
          <input className="input" value={section.config.subtitle || ''} onChange={(e) => onChange({ subtitle: e.target.value })} />
        </div>
      );
    case 'query':
      return (
        <div className="p-2 space-y-2">
          <label className="section-label block">QUERY</label>
          <input className="input" value={section.config.query || ''} onChange={(e) => onChange({ query: e.target.value })} placeholder="risk:>80 country:RU" />
          <label className="section-label block mt-2">LIMIT</label>
          <input type="number" className="input" value={section.config.limit ?? 25} onChange={(e) => onChange({ limit: +e.target.value })} />
        </div>
      );
    case 'anomalies':
      return (
        <div className="p-2 space-y-2">
          <label className="section-label block">LIMIT</label>
          <input type="number" className="input" value={section.config.limit ?? 20} onChange={(e) => onChange({ limit: +e.target.value })} />
        </div>
      );
    case 'cases':
      return (
        <div className="p-2 space-y-2">
          <label className="section-label block">STATUS</label>
          <select className="input" value={section.config.status || ''} onChange={(e) => onChange({ status: e.target.value })}>
            <option value="">all</option>
            <option value="open">open</option>
            <option value="reviewing">reviewing</option>
            <option value="closed">closed</option>
          </select>
        </div>
      );
    case 'notes':
      return (
        <div className="p-2">
          <label className="section-label block">BODY</label>
          <textarea
            className="input h-40"
            value={section.config.body || ''}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Free-form narrative…"
          />
        </div>
      );
    default:
      return null;
  }
}
