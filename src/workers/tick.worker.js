/* eslint-disable no-restricted-globals */
/**
 * Live-tick worker — every 2-5s emits a batch of synthetic events,
 * an occasional anomaly, and counter deltas. The main thread relays
 * these into Zustand and Dexie.
 */

const KINDS = ['transaction', 'login', 'wire', 'alert', 'access', 'kyc_check'];
const SEV = ['info', 'info', 'info', 'info', 'warning', 'critical'];
const DESC = {
  transaction: 'Card transaction',
  login: 'Authentication event',
  wire: 'Outbound wire',
  alert: 'Risk model alert',
  access: 'Record accessed',
  kyc_check: 'KYC verification',
};

let timer = null;
let running = false;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randEntityId() {
  // matches the seed worker's seq('E', idx) format, 50k entities
  const n = Math.floor(Math.random() * 50_000);
  return 'E' + n.toString(36).toUpperCase().padStart(8, '0');
}

function genEvent() {
  const k = pick(KINDS);
  return {
    id: 'V' + Math.random().toString(36).slice(2, 12).toUpperCase().padStart(10, '0'),
    kind: k,
    entityId: randEntityId(),
    counterpartyId: Math.random() < 0.5 ? randEntityId() : undefined,
    ts: Date.now(),
    amount: k === 'wire' || k === 'transaction' ? Math.floor(Math.random() * 50_000) : undefined,
    currency: 'USD',
    severity: pick(SEV),
    description: DESC[k],
  };
}

function genAnomaly() {
  const sev = pick(['medium', 'high', 'critical']);
  const reasons = [
    'Velocity threshold breached',
    'Geolocation anomaly',
    'Round-amount layering',
    'Sanctions match',
    'Behavioral drift',
  ];
  return {
    id: 'A' + Math.random().toString(36).slice(2, 12).toUpperCase().padStart(10, '0'),
    entityId: randEntityId(),
    reason: pick(reasons),
    score: 60 + Math.floor(Math.random() * 40),
    severity: sev,
    detectedAt: Date.now(),
  };
}

function tick() {
  const events = [];
  const burst = 2 + Math.floor(Math.random() * 6);
  for (let i = 0; i < burst; i++) events.push(genEvent());
  const anomaly = Math.random() < 0.18 ? genAnomaly() : null;
  const sysLoad = 18 + Math.floor(Math.random() * 40);
  const queryLatency = 22 + Math.floor(Math.random() * 80);
  self.postMessage({
    type: 'tick',
    events,
    anomaly,
    metrics: { sysLoad, queryLatency, ingestRate: burst },
  });
  if (running) timer = setTimeout(tick, 2000 + Math.random() * 3000);
}

self.addEventListener('message', (e) => {
  if (e.data?.type === 'start' && !running) {
    running = true;
    tick();
  } else if (e.data?.type === 'stop') {
    running = false;
    if (timer) clearTimeout(timer);
    timer = null;
  }
});
