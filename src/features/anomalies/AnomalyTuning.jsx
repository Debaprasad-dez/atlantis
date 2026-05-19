import { useEffect, useMemo, useState } from 'react';
import { Panel, RiskBar, FilterChip, Splitter } from '@/components/primitives';
import { SIGNALS, defaultConfig, scoreEntity } from '@/lib/anomalyModel';
import { db } from '@/db/schema';
import { ulid } from '@/lib/ids';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';

const SEV_COLOR = {
  low: 'text-text-secondary',
  medium: 'text-accent-warning',
  high: 'text-accent-warning',
  critical: 'text-accent-critical',
};

// Type label abbreviations — dense-data convention. Full type goes in the
// title attribute so hover reveals it. Keeps the row layout stable regardless
// of which entity types the preview sample happens to contain.
const TYPE_ABBREV = {
  person: 'PER',
  organization: 'ORG',
  account: 'ACCT',
  transaction: 'TXN',
  location: 'LOC',
  device: 'DEV',
};

export default function AnomalyTuning() {
  const user = useAuthStore((s) => s.user);
  const [config, setConfig] = useState(defaultConfig);
  const [saved, setSaved] = useState([]);
  const [preview, setPreview] = useState({ scored: [], totalScanned: 0, flagged: 0 });
  const [scanning, setScanning] = useState(false);
  const [recent, setRecent] = useState([]);

  // Load saved configs and recent anomalies
  useEffect(() => {
    db.modelConfigs.orderBy('updatedAt').reverse().toArray().then(setSaved);
    db.anomalies.orderBy('detectedAt').reverse().limit(40).toArray().then(setRecent);
  }, []);

  // Rescan a sample of entities when config changes
  useEffect(() => {
    let cancelled = false;
    setScanning(true);
    (async () => {
      const sample = await db.entities.orderBy('riskScore').reverse().limit(500).toArray();
      const scored = sample.map((e) => ({ entity: e, ...scoreEntity({ entity: e }, config) }));
      scored.sort((a, b) => b.composite - a.composite);
      const flagged = scored.filter((s) => s.flagged).length;
      if (!cancelled) {
        setPreview({ scored: scored.slice(0, 30), totalScanned: sample.length, flagged });
        setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config]);

  const updateWeight = (key, v) =>
    setConfig((c) => ({ ...c, weights: { ...c.weights, [key]: v }, updatedAt: Date.now() }));

  const saveConfig = async () => {
    const name = prompt('Name this model config:', config.name);
    if (!name) return;
    const id = config.id === 'default' ? ulid() : config.id;
    const next = { ...config, id, name, updatedAt: Date.now() };
    await db.modelConfigs.put(next);
    audit(user?.id, 'save_model', id, { name, threshold: config.threshold });
    const all = await db.modelConfigs.orderBy('updatedAt').reverse().toArray();
    setSaved(all);
    setConfig(next);
    toast.success(`Saved "${name}"`);
  };

  const loadConfig = (cfg) => {
    setConfig({ ...cfg });
    toast.info(`Loaded "${cfg.name}"`);
  };

  const deleteConfig = async (id) => {
    if (!confirm('Delete this saved model?')) return;
    await db.modelConfigs.delete(id);
    audit(user?.id, 'delete_model', id);
    setSaved((s) => s.filter((c) => c.id !== id));
  };

  const applyFlagged = async () => {
    const newRows = preview.scored
      .filter((s) => s.flagged)
      .slice(0, 40)
      .map((s) => ({
        id: ulid(),
        entityId: s.entity.id,
        reason: `Composite ${s.composite.toFixed(0)} ≥ threshold ${config.threshold}`,
        score: Math.round(s.composite),
        severity:
          s.composite >= 85 ? 'critical' : s.composite >= 70 ? 'high' : s.composite >= 60 ? 'medium' : 'low',
        detectedAt: Date.now(),
      }));
    if (newRows.length === 0) {
      toast.warning('No entities cross the current threshold');
      return;
    }
    await db.anomalies.bulkPut(newRows);
    audit(user?.id, 'apply_model', config.id, { written: newRows.length, threshold: config.threshold });
    const recentRows = await db.anomalies.orderBy('detectedAt').reverse().limit(40).toArray();
    setRecent(recentRows);
    toast.success(`Wrote ${newRows.length} new anomalies`);
  };

  const resetDefaults = () => setConfig(defaultConfig());

  const flagRate = useMemo(
    () => (preview.totalScanned ? (preview.flagged / preview.totalScanned) * 100 : 0),
    [preview],
  );

  return (
    <div className="h-full flex flex-col bg-bg-base">
      <div className="h-9 flex items-center gap-3 px-2 bg-bg-elevated border-b border-border-subtle">
        <span className="section-label">ANOMALY DETECTION · TUNING</span>
        <span className="tabular text-micro text-text-muted">
          model:{' '}
          <span className="text-text-secondary">{config.name}</span>
          {' · '}
          {scanning ? 'scanning…' : `${preview.flagged}/${preview.totalScanned} flagged (${flagRate.toFixed(1)}%)`}
        </span>
        <div className="flex-1" />
        <button type="button" className="btn h-7" onClick={resetDefaults}>RESET</button>
        <button type="button" className="btn h-7" onClick={saveConfig}>★ SAVE</button>
        <button type="button" className="btn btn-primary h-7" onClick={applyFlagged} disabled={preview.flagged === 0}>
          APPLY → ANOMALIES
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <Splitter id="anomaly.signals" direction="row" primary="first" initialSize={288} minSize={240} maxSize={420}>
        {/* Left: signal weights + threshold */}
        <aside className="h-full bg-bg-panel border-r border-border-subtle overflow-auto">
          <div className="section-label px-2 py-1.5 border-b border-border-subtle">SIGNALS &amp; WEIGHTS</div>
          {SIGNALS.map((s) => (
            <div key={s.key} className="px-2 py-2 border-b border-border-subtle/60">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-primary">{s.label}</span>
                <span className="tabular text-micro text-text-secondary">
                  {(config.weights[s.key] ?? 0).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.weights[s.key] ?? 0}
                onChange={(e) => updateWeight(s.key, +e.target.value)}
                className="w-full accent-accent-primary mt-1"
              />
              <p className="text-micro text-text-muted mt-0.5">{s.description}</p>
            </div>
          ))}

          <div className="section-label px-2 py-1.5 border-y border-border-subtle">THRESHOLD</div>
          <div className="px-2 py-2">
            <input
              type="range"
              min="0"
              max="100"
              value={config.threshold}
              onChange={(e) => setConfig((c) => ({ ...c, threshold: +e.target.value }))}
              className="w-full accent-accent-primary"
            />
            <div className="flex justify-between text-micro tabular text-text-muted">
              <span>flag ≥</span><span>{config.threshold}</span>
            </div>
          </div>

          <div className="section-label px-2 py-1.5 border-y border-border-subtle">SAVED MODELS</div>
          <ul>
            {saved.map((c) => (
              <li key={c.id} className="group flex items-center justify-between px-2 py-1.5 hover:bg-bg-hover">
                <button type="button" onClick={() => loadConfig(c)} className="flex-1 text-left text-xs truncate">
                  {c.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteConfig(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-critical"
                  aria-label={`Delete ${c.name}`}
                >
                  ×
                </button>
              </li>
            ))}
            {saved.length === 0 && (
              <li className="px-2 py-2 text-micro text-text-muted">No saved models.</li>
            )}
          </ul>
        </aside>

        <Splitter id="anomaly.history" direction="row" primary="second" initialSize={288} minSize={240} maxSize={420}>
        {/* Center: scored preview */}
        <main className="h-full min-w-0 flex flex-col">
          <Panel
            className="flex-1 min-h-0 flex flex-col"
            header={
              <div className="flex items-center justify-between w-full">
                <span className="section-label">PREVIEW · TOP {preview.scored.length}</span>
                <span className="tabular text-micro text-text-muted">
                  threshold {config.threshold} · {preview.flagged} flagged
                </span>
              </div>
            }
          >
            <ul className="h-full overflow-auto min-w-0">
              {preview.scored.map((s) => {
                const abbrev = TYPE_ABBREV[s.entity.type] || s.entity.type.slice(0, 4).toUpperCase();
                return (
                  <li
                    key={s.entity.id}
                    className="px-2 py-1.5 border-b border-border-subtle/50 hover:bg-bg-hover min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="section-label text-viz-cyan w-12 flex-shrink-0 truncate"
                        title={s.entity.type}
                      >
                        {abbrev}
                      </span>
                      <span className="text-xs flex-1 min-w-0 truncate">{s.entity.name}</span>
                      <span className="mono text-micro text-text-faint w-24 flex-shrink-0 truncate text-right">
                        {s.entity.id}
                      </span>
                      <div className="w-28 flex-shrink-0">
                        <RiskBar score={s.composite} />
                      </div>
                      <div className="flex-shrink-0 w-[68px] flex justify-end">
                        <FilterChip label={s.flagged ? 'FLAGGED' : 'BELOW'} active={s.flagged} />
                      </div>
                    </div>
                    <div className="flex gap-1 mt-1 ml-14 flex-wrap">
                      {SIGNALS.map((sig) => {
                        const v = s.breakdown[sig.key] ?? 0;
                        const w = config.weights[sig.key] ?? 0;
                        if (w <= 0 || v <= 0) return null;
                        return (
                          <span
                            key={sig.key}
                            title={`${sig.label}: ${v.toFixed(0)} (weight ${w})`}
                            className="chip border-border-emphasis"
                          >
                            {sig.key.split('_')[0]} {v.toFixed(0)}
                          </span>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </main>

        {/* Right: persisted anomaly history */}
        <aside className="h-full bg-bg-panel border-l border-border-subtle overflow-auto">
          <div className="section-label px-2 py-1.5 border-b border-border-subtle">
            RECENT WRITES · {recent.length}
          </div>
          {recent.map((a) => (
            <div key={a.id} className="px-2 py-1.5 border-b border-border-subtle/60">
              <div className="flex justify-between text-micro tabular">
                <span className={`section-label ${SEV_COLOR[a.severity]}`}>{a.severity}</span>
                <span className="text-text-muted">score {a.score}</span>
              </div>
              <div className="text-xs text-text-primary truncate">{a.reason}</div>
              <div className="mono text-micro text-text-faint truncate">{a.entityId}</div>
            </div>
          ))}
          {recent.length === 0 && (
            <div className="px-2 py-3 text-micro text-text-muted">
              No anomalies written yet. Apply the current model to populate.
            </div>
          )}
        </aside>
        </Splitter>
        </Splitter>
      </div>
    </div>
  );
}
