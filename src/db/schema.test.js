import { describe, it, expect } from 'vitest';
import { db } from './schema';

describe('Dexie schema', () => {
  it('DB-SCH-01: db is named "atlantis"', () => {
    expect(db.name).toBe('atlantis');
  });

  it('DB-SCH-02: defines the expected tables (v1 + v2 + v3)', () => {
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        // v1 — Phase 1
        'anomalies',
        'audit',
        'entities',
        'events',
        'investigations',
        'meta',
        'relationships',
        'roles',
        'sources',
        'users',
        // v2 — Phase 2
        'savedQueries',
        'caseNotes',
        'caseEvidence',
        // v3 — Phase 3
        'modelConfigs',
        'reports',
        'tileCache',
      ].sort(),
    );
  });

  it('DB-SCH-03: bulkPut + where().equals() round-trips', async () => {
    await db.entities.bulkPut([
      { id: 'E1', type: 'person', name: 'A', riskScore: 10, tags: [], createdAt: 1, updatedAt: 1 },
      { id: 'E2', type: 'account', name: 'B', riskScore: 90, tags: [], createdAt: 1, updatedAt: 1 },
      { id: 'E3', type: 'person', name: 'C', riskScore: 50, tags: [], createdAt: 1, updatedAt: 1 },
    ]);
    const persons = await db.entities.where('type').equals('person').toArray();
    expect(persons.map((p) => p.id).sort()).toEqual(['E1', 'E3']);
  });

  it('DB-SCH-04: compound [entityId+ts] index queries work', async () => {
    await db.events.bulkPut([
      { id: 'V1', kind: 'login', entityId: 'E1', ts: 1, severity: 'info', description: '' },
      { id: 'V2', kind: 'login', entityId: 'E1', ts: 2, severity: 'info', description: '' },
      { id: 'V3', kind: 'login', entityId: 'E2', ts: 1, severity: 'info', description: '' },
    ]);
    const rows = await db.events.where('[entityId+ts]').between(['E1', 0], ['E1', 99]).toArray();
    expect(rows).toHaveLength(2);
  });

  it('DB-SCH-05: meta key/value round-trips', async () => {
    await db.meta.put({ key: 'seeded', value: true, at: 1 });
    expect((await db.meta.get('seeded')).value).toBe(true);
  });
});
