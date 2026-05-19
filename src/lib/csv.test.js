import { describe, it, expect } from 'vitest';
import { toCSV } from './csv';

describe('toCSV', () => {
  it('CSV-01: produces header + rows', () => {
    const out = toCSV([{ a: 1, b: 'x' }], [{ key: 'a' }, { key: 'b' }]);
    expect(out.split('\r\n')).toEqual(['a,b', '1,x']);
  });
  it('CSV-02: quotes values with commas or newlines', () => {
    const out = toCSV([{ a: 'hello, world\nnext' }], [{ key: 'a' }]);
    expect(out).toContain('"hello, world\nnext"');
  });
  it('CSV-03: doubles internal quotes', () => {
    const out = toCSV([{ a: 'say "hi"' }], [{ key: 'a' }]);
    expect(out).toContain('"say ""hi"""');
  });
  it('CSV-04: respects custom value function and header', () => {
    const out = toCSV(
      [{ a: 1 }],
      [{ key: 'a', header: 'A', value: (r) => r.a * 10 }],
    );
    expect(out).toBe('A\r\n10');
  });
});
