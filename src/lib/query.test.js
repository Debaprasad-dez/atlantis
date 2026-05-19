import { describe, it, expect } from 'vitest';
import { tokenize, parseClause, parseQuery, compileQuery } from './query';

describe('tokenize', () => {
  it('Q-TK-01: splits on whitespace', () => {
    expect(tokenize('a b c')).toEqual(['a', 'b', 'c']);
  });
  it('Q-TK-02: preserves quoted strings', () => {
    expect(tokenize('name:"halcyon holdings" type:org')).toEqual([
      'name:"halcyon holdings"',
      'type:org',
    ]);
  });
  it('Q-TK-03: empty input → empty array', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('parseClause', () => {
  it('Q-PC-01: type:person → eq clause', () => {
    expect(parseClause('type:person')).toMatchObject({ field: 'type', op: 'eq', value: 'person' });
  });
  it('Q-PC-02: risk:>80 → gt 80', () => {
    expect(parseClause('risk:>80')).toMatchObject({ field: 'risk', op: 'gt', value: 80 });
  });
  it('Q-PC-03: risk:60..100 → range', () => {
    expect(parseClause('risk:60..100')).toMatchObject({
      field: 'risk',
      op: 'range',
      value: [60, 100],
    });
  });
  it('Q-PC-04: country:RU,CY → in list', () => {
    expect(parseClause('country:RU,CY')).toMatchObject({
      field: 'country',
      op: 'in',
      value: ['RU', 'CY'],
    });
  });
  it('Q-PC-05: name:"halcyon holdings" → contains (strips quotes)', () => {
    expect(parseClause('name:"halcyon holdings"')).toMatchObject({
      field: 'name',
      op: 'contains',
      value: 'halcyon holdings',
    });
  });
  it('Q-PC-06: id is uppercased', () => {
    expect(parseClause('id:e000abcd')).toMatchObject({ value: 'E000ABCD' });
  });
  it('Q-PC-07: unknown field → error', () => {
    const r = parseClause('xyz:1');
    expect(r).toHaveProperty('error');
  });
  it('Q-PC-08: missing colon → error', () => {
    expect(parseClause('foo')).toHaveProperty('error');
  });
  it('Q-PC-09: risk with non-numeric → error', () => {
    expect(parseClause('risk:notanumber')).toHaveProperty('error');
  });
});

describe('parseQuery & compileQuery predicate', () => {
  const sample = [
    { id: 'E1', type: 'person', name: 'Alice', riskScore: 95, country: 'RU', tags: ['pep'] },
    { id: 'E2', type: 'person', name: 'Bob', riskScore: 40, country: 'US', tags: [] },
    { id: 'E3', type: 'organization', name: 'Halcyon Holdings', riskScore: 78, country: 'KY', tags: ['shell-company'] },
    { id: 'E4', type: 'account', name: 'ACCT-9', riskScore: 60, country: 'US', tags: [] },
  ];

  it('Q-PQ-01: empty → matches all', () => {
    const { predicate } = compileQuery('');
    expect(sample.every(predicate)).toBe(true);
  });
  it('Q-PQ-02: AND across clauses', () => {
    const { predicate } = compileQuery('type:person risk:>80');
    expect(sample.filter(predicate).map((e) => e.id)).toEqual(['E1']);
  });
  it('Q-PQ-03: range filter', () => {
    const { predicate } = compileQuery('risk:40..70');
    expect(sample.filter(predicate).map((e) => e.id).sort()).toEqual(['E2', 'E4']);
  });
  it('Q-PQ-04: country list', () => {
    const { predicate } = compileQuery('country:RU,KY');
    expect(sample.filter(predicate).map((e) => e.id).sort()).toEqual(['E1', 'E3']);
  });
  it('Q-PQ-05: name contains', () => {
    const { predicate } = compileQuery('name:hal');
    expect(sample.filter(predicate).map((e) => e.id)).toEqual(['E3']);
  });
  it('Q-PQ-06: tag filter', () => {
    const { predicate } = compileQuery('tag:shell-company');
    expect(sample.filter(predicate).map((e) => e.id)).toEqual(['E3']);
  });
  it('Q-PQ-07: errors are reported', () => {
    const r = parseQuery('xyz:1 risk:abc');
    expect(r.errors.length).toBe(2);
    expect(r.clauses).toHaveLength(0);
  });
});
