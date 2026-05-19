/**
 * ATLANTIS query language.
 *
 * Grammar:
 *   query        := clause (WS clause)*
 *   clause       := field ":" value
 *   field        := "type" | "country" | "tag" | "risk" | "name" | "id"
 *   value        := comparison | range | list | string
 *   comparison   := (">"|"<"|">="|"<="|"=") number
 *   range        := number ".." number
 *   list         := value ("," value)+
 *   string       := unquoted | "quoted with spaces"
 *
 * Examples:
 *   type:person risk:>80 country:RU
 *   tag:sanctioned,pep risk:60..100
 *   name:"halcyon holdings"
 *   id:E000ABCD
 */

const FIELDS = new Set(['type', 'country', 'tag', 'tags', 'risk', 'name', 'id']);

/**
 * @typedef {Object} Clause
 * @property {'type'|'country'|'tag'|'risk'|'name'|'id'} field
 * @property {'eq'|'gt'|'lt'|'gte'|'lte'|'range'|'in'|'contains'} op
 * @property {any} value
 * @property {string} raw
 */

/**
 * @typedef {Object} ParseResult
 * @property {Clause[]} clauses
 * @property {string[]} errors
 */

/**
 * Tokenize input into raw chip strings (split on whitespace, respect quotes).
 * @param {string} input
 * @returns {string[]}
 */
export function tokenize(input) {
  const out = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      inQuote = !inQuote;
      cur += c;
      continue;
    }
    if (/\s/.test(c) && !inQuote) {
      if (cur) out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Parse a single chip ("field:value") into a Clause.
 * @param {string} raw
 * @returns {Clause | { error: string, raw: string }}
 */
export function parseClause(raw) {
  const colon = raw.indexOf(':');
  if (colon === -1) return { error: 'Missing ":" — use field:value', raw };
  const field = raw.slice(0, colon).trim().toLowerCase();
  let value = raw.slice(colon + 1).trim();
  if (!FIELDS.has(field)) return { error: `Unknown field "${field}"`, raw };
  const normField = field === 'tags' ? 'tag' : field;

  // strip quotes
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);

  // numeric field
  if (normField === 'risk') {
    const range = value.match(/^(-?\d+)\.\.(-?\d+)$/);
    if (range) return { field: normField, op: 'range', value: [+range[1], +range[2]], raw };
    const cmp = value.match(/^(>=|<=|>|<|=)?(-?\d+(?:\.\d+)?)$/);
    if (!cmp) return { error: `risk expects number, >N, <N, >=N, <=N, or N..M (got "${value}")`, raw };
    const opMap = { '>': 'gt', '<': 'lt', '>=': 'gte', '<=': 'lte', '=': 'eq', undefined: 'eq', '': 'eq' };
    return { field: normField, op: opMap[cmp[1]] ?? 'eq', value: parseFloat(cmp[2]), raw };
  }

  // list (csv) — applies to type / country / tag
  if (value.includes(',')) {
    const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
    return { field: normField, op: 'in', value: parts, raw };
  }

  if (normField === 'name') return { field: normField, op: 'contains', value, raw };
  if (normField === 'id') return { field: normField, op: 'contains', value: value.toUpperCase(), raw };
  return { field: normField, op: 'eq', value, raw };
}

/**
 * @param {string} input
 * @returns {ParseResult}
 */
export function parseQuery(input) {
  const tokens = tokenize(input || '');
  const clauses = [];
  const errors = [];
  for (const t of tokens) {
    const r = parseClause(t);
    if ('error' in r) errors.push(`${r.raw} → ${r.error}`);
    else clauses.push(r);
  }
  return { clauses, errors };
}

/**
 * Match a single entity against a clause.
 * @param {import('@/types').Entity} e
 * @param {Clause} c
 */
function matchOne(e, c) {
  switch (c.field) {
    case 'type': {
      if (c.op === 'in') return c.value.includes(e.type);
      return e.type === c.value;
    }
    case 'country': {
      const v = (e.country || '').toUpperCase();
      const list = c.op === 'in' ? c.value.map((x) => x.toUpperCase()) : [String(c.value).toUpperCase()];
      return list.includes(v);
    }
    case 'tag': {
      const tags = e.tags || [];
      if (c.op === 'in') return c.value.some((t) => tags.includes(t));
      return tags.includes(c.value);
    }
    case 'risk': {
      const r = e.riskScore ?? 0;
      switch (c.op) {
        case 'eq': return r === c.value;
        case 'gt': return r > c.value;
        case 'lt': return r < c.value;
        case 'gte': return r >= c.value;
        case 'lte': return r <= c.value;
        case 'range': return r >= c.value[0] && r <= c.value[1];
        default: return false;
      }
    }
    case 'name':
      return (e.name || '').toLowerCase().includes(String(c.value).toLowerCase());
    case 'id':
      return (e.id || '').toUpperCase().includes(String(c.value).toUpperCase());
    default:
      return true;
  }
}

/**
 * Returns a predicate that AND-combines all clauses.
 * @param {Clause[]} clauses
 */
export function clausesToPredicate(clauses) {
  if (!clauses?.length) return () => true;
  return (e) => clauses.every((c) => matchOne(e, c));
}

/**
 * Convenience: parse + return predicate.
 * @param {string} input
 */
export function compileQuery(input) {
  const { clauses, errors } = parseQuery(input);
  return { predicate: clausesToPredicate(clauses), clauses, errors };
}
