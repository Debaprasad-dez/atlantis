/**
 * Tiny CSV helpers — no dependencies, RFC 4180-ish.
 */

/**
 * Escape a value for CSV. Wraps in quotes if it contains delimiter / quote / newline.
 * @param {any} v
 */
function esc(v) {
  if (v == null) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Build a CSV string from an array of rows and a column spec.
 *
 * @template T
 * @param {T[]} rows
 * @param {Array<{key: string, header?: string, value?: (row: T) => any}>} columns
 * @returns {string}
 */
export function toCSV(rows, columns) {
  const header = columns.map((c) => esc(c.header ?? c.key)).join(',');
  const lines = rows.map((r) =>
    columns.map((c) => esc(c.value ? c.value(r) : r[c.key])).join(','),
  );
  return [header, ...lines].join('\r\n');
}

/**
 * Trigger a browser download of a CSV blob.
 * @param {string} filename
 * @param {string} csv
 */
export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
