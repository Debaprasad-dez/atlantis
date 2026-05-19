import { describe, it, expect } from 'vitest';
import { SIGNALS, defaultConfig, scoreEntity } from './anomalyModel';

const mkEntity = (over = {}) => ({
  id: 'E1',
  type: 'person',
  name: 'X',
  riskScore: 50,
  tags: [],
  country: 'US',
  ...over,
});

describe('anomaly model', () => {
  it('AMOD-01: defaults have weight for every signal', () => {
    const c = defaultConfig();
    for (const s of SIGNALS) expect(c.weights[s.key]).toBeGreaterThan(0);
  });

  it('AMOD-02: sanctioned entity scores high on sanctions_match', () => {
    const r = scoreEntity({ entity: mkEntity({ tags: ['sanctioned'] }) }, defaultConfig());
    expect(r.breakdown.sanctions_match).toBe(100);
    expect(r.composite).toBeGreaterThan(20);
  });

  it('AMOD-03: weight of zero removes signal from composite', () => {
    const c = defaultConfig();
    c.weights.sanctions_match = 0;
    const r = scoreEntity({ entity: mkEntity({ tags: ['sanctioned'] }) }, c);
    const baseline = scoreEntity({ entity: mkEntity({ tags: [] }) }, c);
    expect(r.composite).toBeCloseTo(baseline.composite, 5);
  });

  it('AMOD-04: flagged is true iff composite ≥ threshold', () => {
    const c = defaultConfig();
    c.threshold = 99.9;
    const r = scoreEntity({ entity: mkEntity({ tags: ['sanctioned'] }) }, c);
    expect(r.flagged).toBe(false);
    c.threshold = 0;
    const r2 = scoreEntity({ entity: mkEntity({ tags: ['sanctioned'] }) }, c);
    expect(r2.flagged).toBe(true);
  });

  it('AMOD-05: high-risk jurisdiction signal fires for RU', () => {
    const r = scoreEntity({ entity: mkEntity({ country: 'RU' }) }, defaultConfig());
    expect(r.breakdown.high_risk_jurisdiction).toBe(80);
  });
});
