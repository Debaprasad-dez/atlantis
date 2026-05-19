import Dexie from 'dexie';

/**
 * Atlantis Dexie database — primary client-side store.
 * Schema strings follow Dexie syntax: 'pk, idx1, idx2, [compound+idx]'
 */
export class AtlantisDB extends Dexie {
  constructor() {
    super('atlantis');
    this.version(1).stores({
      entities: 'id, type, riskScore, country, createdAt, updatedAt, *tags',
      relationships: 'id, sourceId, targetId, kind, lastSeen, [sourceId+kind], [targetId+kind]',
      events: 'id, kind, entityId, ts, severity, [entityId+ts]',
      anomalies: 'id, entityId, severity, detectedAt',
      investigations: 'id, status, ownerId, updatedAt',
      audit: '++id, userId, action, ts',
      users: 'id, email, roleId',
      roles: 'id, name',
      sources: 'id, kind, status',
      meta: 'key',
    });
    // v2 — Phase 2: saved queries and case notes/evidence
    this.version(2).stores({
      savedQueries: 'id, name, createdAt',
      caseNotes: 'id, caseId, createdAt',
      caseEvidence: 'id, caseId, kind, createdAt',
    });
    // v3 — Phase 3: anomaly model configs, saved reports, geo tile cache.
    // `hash` and `prevHash` are added to audit rows but not indexed (they're
    // read sequentially during chain verification).
    this.version(3).stores({
      modelConfigs: 'id, name, updatedAt',
      reports: 'id, name, updatedAt',
      tileCache: '[z+x+y], updatedAt',
    });
  }
}

export const db = new AtlantisDB();
