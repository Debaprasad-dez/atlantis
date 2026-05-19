import { describe, it, expect } from 'vitest';
import { append, verifyChain } from './audit';
import { db } from '@/db/schema';

describe('audit repo — hash chain', () => {
  it('CHAIN-01: append writes a row with hash + prevHash', async () => {
    await append({ userId: 'u', action: 'login' });
    const rows = await db.audit.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].prevHash).toMatch(/^0+$/);
  });

  it('CHAIN-02: subsequent rows chain to the previous hash', async () => {
    await append({ userId: 'u', action: 'a' });
    await append({ userId: 'u', action: 'b' });
    const rows = await db.audit.orderBy('id').toArray();
    expect(rows[1].prevHash).toBe(rows[0].hash);
  });

  it('CHAIN-03: verifyChain returns ok for an untouched chain', async () => {
    for (const action of ['login', 'view_entity', 'run_query']) {
      await append({ userId: 'u', action });
    }
    const r = await verifyChain();
    expect(r.tampered).toBeNull();
    expect(r.verifiedRows).toBe(3);
  });

  it('CHAIN-04: verifyChain catches mutation of action', async () => {
    await append({ userId: 'u', action: 'login' });
    await append({ userId: 'u', action: 'view_entity', target: 'E1' });
    // Tamper with the second row's target
    const rows = await db.audit.orderBy('id').toArray();
    await db.audit.update(rows[1].id, { target: 'E2' });
    const r = await verifyChain();
    expect(r.tampered).not.toBeNull();
    expect(r.tampered.id).toBe(rows[1].id);
  });

  it('CHAIN-05: legacy rows without hash are treated as anchors', async () => {
    // Insert a pre-chain row manually
    await db.audit.add({ userId: 'u', action: 'login', ts: 1 });
    await append({ userId: 'u', action: 'view_entity' });
    const r = await verifyChain();
    expect(r.tampered).toBeNull();
    expect(r.anchorRows).toBe(1);
    expect(r.verifiedRows).toBe(1);
  });
});
