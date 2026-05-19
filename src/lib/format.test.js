import { describe, it, expect } from 'vitest';
import {
  fmtInt,
  fmtCompact,
  fmtMoney,
  fmtTime,
  fmtDateTime,
  fmtRelative,
  fmtPct,
} from './format';

describe('format helpers', () => {
  it('LIB-FMT-01/02/03: fmtInt', () => {
    expect(fmtInt(0)).toBe('0');
    expect(fmtInt(1234567)).toMatch(/,/);
    expect(fmtInt(null)).toBe('0');
  });

  it('LIB-FMT-04: fmtCompact', () => {
    expect(fmtCompact(1500)).toBe('1.5K');
  });

  it('LIB-FMT-05/06: fmtMoney', () => {
    expect(fmtMoney(1234.5)).toContain('$');
    expect(fmtMoney(1234.5)).toContain('.50');
    expect(fmtMoney(1, 'EUR')).toContain('EUR');
  });

  it('LIB-FMT-07: fmtTime', () => {
    expect(fmtTime(0)).toBe('00:00:00');
  });

  it('LIB-FMT-08: fmtDateTime', () => {
    expect(fmtDateTime(0)).toBe('1970-01-01 00:00:00');
  });

  it('LIB-FMT-09/10/11: fmtRelative', () => {
    const now = Date.now();
    expect(fmtRelative(now - 5000)).toMatch(/^[5-6]s ago$/);
    expect(fmtRelative(now - 3 * 60 * 1000)).toBe('3m ago');
    expect(fmtRelative(now + 5000)).toBe('in future');
  });

  it('LIB-FMT-12: fmtPct', () => {
    expect(fmtPct(33.456)).toBe('33.5%');
  });
});
