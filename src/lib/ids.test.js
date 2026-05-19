import { describe, it, expect } from 'vitest';
import { ulid, seq } from './ids';

describe('ulid', () => {
  it('LIB-IDS-01: returns a non-empty string', () => {
    expect(ulid()).toMatch(/.+/);
  });

  it('LIB-IDS-02: is uppercase alphanumeric, ~19 chars', () => {
    const id = ulid();
    expect(id).toMatch(/^[0-9A-Z]+$/);
    expect(id.length).toBeGreaterThanOrEqual(18);
    expect(id.length).toBeLessThanOrEqual(20);
  });

  it('LIB-IDS-03: two successive calls are distinct', () => {
    expect(ulid()).not.toBe(ulid());
  });

  it('LIB-IDS-04: prefix encodes time order', () => {
    const a = ulid();
    // small spin to advance Date.now()
    const start = Date.now();
    while (Date.now() === start) {
      /* spin */
    }
    const b = ulid();
    // The 9-char time prefix should sort a < b.
    expect(a.slice(0, 9) <= b.slice(0, 9)).toBe(true);
  });
});

describe('seq', () => {
  it('LIB-IDS-05: returns prefix + base36 padded to 8', () => {
    expect(seq('E', 0)).toBe('E00000000');
  });
  it('LIB-IDS-06: encodes 35 as "Z"', () => {
    expect(seq('E', 35)).toBe('E0000000Z');
  });
});
