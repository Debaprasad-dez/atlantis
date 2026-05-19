import { useState } from 'react';

const STEPS = [
  {
    title: 'Graph Overview',
    icon: '◈',
    body: 'The graph visualises entities (nodes) and their relationships (edges). Each node represents an entity in the fraud intelligence database — a person, organisation, account, transaction, location, or device.',
  },
  {
    title: 'Node Colours',
    icon: '●',
    body: (
      <div className="space-y-1.5">
        <p className="text-text-muted mb-2">Node colour encodes risk level:</p>
        {[
          { color: '#FF4747', label: 'Critical risk  (score > 80)' },
          { color: '#FFB627', label: 'Elevated risk  (score 60–80)' },
          { color: '#00D9FF', label: 'Normal  (score < 60)' },
          { color: '#22D3A6', label: 'Pinned node' },
          { color: '#FFFFFF', label: 'Selected node' },
        ].map((r) => (
          <div key={r.color} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: r.color }} />
            <span className="text-text-secondary">{r.label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Node Size',
    icon: '⊙',
    body: 'Node size reflects degree (number of connections) and risk score combined. Larger nodes are more connected or higher risk — they are the key hubs in the network.',
  },
  {
    title: 'Edge Colours',
    icon: '─',
    body: (
      <div className="space-y-1.5">
        <p className="text-text-muted mb-2">Edge colour encodes relationship type:</p>
        {[
          { color: '#00D9FF', label: 'transacts_with — financial transfer' },
          { color: '#22D3A6', label: 'owns — ownership / beneficial ownership' },
          { color: '#FFB627', label: 'controls — operational control' },
          { color: '#A78BFA', label: 'communicates_with — messaging / comms link' },
          { color: '#FF7A6B', label: 'co_located — shared physical location' },
          { color: '#FF4ECD', label: 'shares_device — same device fingerprint' },
        ].map((r) => (
          <div key={r.color} className="flex items-center gap-2">
            <span className="h-0.5 w-5 flex-shrink-0" style={{ background: r.color }} />
            <span className="text-text-secondary text-micro">{r.label}</span>
          </div>
        ))}
        <p className="text-text-muted mt-1 text-micro">Animated particles on <span className="text-viz-cyan">transacts_with</span> edges show money flow direction.</p>
      </div>
    ),
  },
  {
    title: 'Node Types',
    icon: '◻',
    body: (
      <div className="space-y-1.5">
        <p className="text-text-muted mb-2">Entity type is shown in the inspector when you select a node:</p>
        {[
          { icon: '👤', type: 'person', desc: 'Individual — KYC subject, beneficial owner, PEP' },
          { icon: '🏢', type: 'organization', desc: 'Legal entity — company, shell, foundation' },
          { icon: '💳', type: 'account', desc: 'Financial account — bank, crypto, wallet' },
          { icon: '💸', type: 'transaction', desc: 'Single transaction or wire transfer' },
          { icon: '📍', type: 'location', desc: 'Physical location — address, port, branch' },
          { icon: '📱', type: 'device', desc: 'Device fingerprint — phone, laptop, IP' },
        ].map((r) => (
          <div key={r.type} className="flex items-start gap-2">
            <span className="text-base leading-none flex-shrink-0 mt-0.5">{r.icon}</span>
            <div>
              <span className="section-label text-accent-primary">{r.type}</span>
              <span className="text-text-muted text-micro ml-1">— {r.desc}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Interactions',
    icon: '⌖',
    body: (
      <div className="space-y-1.5 text-text-secondary">
        <div className="flex items-start gap-2"><span className="text-accent-primary w-24 flex-shrink-0">Click</span><span>Select a node — opens the inspector panel.</span></div>
        <div className="flex items-start gap-2"><span className="text-accent-primary w-24 flex-shrink-0">Shift-click</span><span>Multi-select nodes for bulk operations.</span></div>
        <div className="flex items-start gap-2"><span className="text-accent-primary w-24 flex-shrink-0">Right-click</span><span>Context menu — expand, pin, hide, add to case.</span></div>
        <div className="flex items-start gap-2"><span className="text-accent-primary w-24 flex-shrink-0">FIT</span><span>Zoom the camera to fit all visible nodes.</span></div>
        <div className="flex items-start gap-2"><span className="text-accent-primary w-24 flex-shrink-0">EXPAND</span><span>Load all neighbours of the selected node.</span></div>
        <div className="flex items-start gap-2"><span className="text-accent-primary w-24 flex-shrink-0">PIN ⊙</span><span>Lock a node's position in the simulation.</span></div>
        <div className="flex items-start gap-2"><span className="text-accent-primary w-24 flex-shrink-0">HIDE ◌</span><span>Remove a node from view (UNHIDE ALL to restore).</span></div>
        <div className="flex items-start gap-2"><span className="text-accent-primary w-24 flex-shrink-0">Scrubber</span><span>Slide the time bar to replay historical graph state.</span></div>
      </div>
    ),
  },
  {
    title: 'Layouts',
    icon: '⊞',
    body: (
      <div className="space-y-1.5 text-text-secondary">
        <div className="flex items-start gap-2"><span className="text-accent-primary w-16 flex-shrink-0">FORCE</span><span>Physics simulation — clusters form around strongly-connected nodes. Best for pattern discovery.</span></div>
        <div className="flex items-start gap-2"><span className="text-accent-primary w-16 flex-shrink-0">RADIAL</span><span>Nodes arranged in concentric rings by risk. High-risk nodes sit closer to the centre.</span></div>
        <div className="flex items-start gap-2"><span className="text-accent-primary w-16 flex-shrink-0">GRID</span><span>Uniform grid layout — useful for comparing large sets of nodes side-by-side.</span></div>
      </div>
    ),
  },
];

export function GraphTutorialOverlay({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-palette bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-bg-elevated border border-border-emphasis shadow-panel w-[480px] max-h-[80vh] flex flex-col animate-flipIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          <span className="text-accent-primary text-lg">{current.icon}</span>
          <span className="text-sm font-semibold text-text-primary tracking-wide">{current.title}</span>
          <div className="flex-1" />
          <span className="section-label text-text-faint">{step + 1} / {STEPS.length}</span>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary ml-2">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 py-3 text-sm text-text-secondary leading-relaxed">
          {typeof current.body === 'string' ? <p>{current.body}</p> : current.body}
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 py-2 border-t border-border-subtle">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${i === step ? 'bg-accent-primary' : 'bg-border-emphasis hover:bg-border-strong'}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-2 px-4 pb-3">
          <button type="button" className="btn h-7 flex-1" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            ← Previous
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn h-7 btn-primary flex-1" onClick={() => setStep((s) => s + 1)}>
              Next →
            </button>
          ) : (
            <button type="button" className="btn h-7 btn-primary flex-1" onClick={onClose}>
              Done ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
