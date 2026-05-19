import { describe, it, expect, vi } from 'vitest';
import { audit } from './audit';
import { db } from '@/db/schema';

describe('audit()', () => {
  it('LIB-AUD-01/02: writes a row with userId/action/ts', async () => {
    await audit('user_x', 'view_entity', 'E000', { foo: 1 });
    const rows = await db.audit.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe('user_x');
    expect(rows[0].action).toBe('view_entity');
    expect(typeof rows[0].ts).toBe('number');
  });

  it('LIB-AUD-03: missing userId falls back to "system"', async () => {
    await audit(null, 'boot');
    const rows = await db.audit.toArray();
    expect(rows.at(-1).userId).toBe('system');
  });

  it('LIB-AUD-04: never throws on Dexie failure', async () => {
    const spy = vi.spyOn(db.audit, 'add').mockRejectedValueOnce(new Error('boom'));
    await expect(audit('u', 'x')).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it('LIB-AUD-05: persists target and details', async () => {
    await audit('u', 'view_entity', 'E001', { fromSearch: true });
    const row = (await db.audit.toArray()).at(-1);
    expect(row.target).toBe('E001');
    expect(row.details).toEqual({ fromSearch: true });
  });
});
