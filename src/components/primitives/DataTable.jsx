import PropTypes from 'prop-types';
import { TableVirtuoso } from 'react-virtuoso';
import clsx from 'clsx';
import { useState } from 'react';

/**
 * Virtualized data table — built for 50k+ rows.
 * Renders only visible rows; preserves dense Palantir-style aesthetic.
 *
 * @template T
 * @param {Object} props
 * @param {T[]} props.rows
 * @param {Array<{key: string, label: string, width?: number, align?: 'left'|'right'|'center', render?: (row: T) => React.ReactNode, mono?: boolean}>} props.columns
 * @param {(row: T) => string} [props.rowKey]
 * @param {(row: T) => void} [props.onRowClick]
 * @param {string} [props.selectedKey]
 * @param {string} [props.className]
 */
export function DataTable({ rows, columns, rowKey, onRowClick, selectedKey, className }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

  const sorted = sort.key
    ? [...rows].sort((a, b) => {
        const av = a?.[sort.key];
        const bv = b?.[sort.key];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number')
          return sort.dir === 'asc' ? av - bv : bv - av;
        return sort.dir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      })
    : rows;

  const toggleSort = (key) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  };

  return (
    <div className={clsx('h-full w-full bg-bg-panel', className)}>
      <TableVirtuoso
        data={sorted}
        components={{
          Table: (props) => (
            <table {...props} className="w-full border-collapse text-xs" />
          ),
          TableHead: (props) => (
            <thead
              {...props}
              className="bg-bg-elevated text-text-secondary sticky top-0 z-10"
            />
          ),
          TableRow: (props) => {
            const row = props.item;
            const key = rowKey ? rowKey(row) : undefined;
            return (
              <tr
                {...props}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'border-b border-border-subtle/60 hover:bg-bg-hover transition-colors duration-100',
                  selectedKey && key === selectedKey && 'bg-accent-primary/10',
                  onRowClick && 'cursor-pointer',
                )}
              />
            );
          },
        }}
        fixedHeaderContent={() => (
          <tr className="border-b border-border-emphasis">
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key)}
                style={{ width: c.width, textAlign: c.align || 'left' }}
                className="px-2 h-7 section-label cursor-pointer select-none whitespace-nowrap hover:text-text-primary"
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {sort.key === c.key ? (
                    <span className="text-accent-primary">{sort.dir === 'asc' ? '▲' : '▼'}</span>
                  ) : null}
                </span>
              </th>
            ))}
          </tr>
        )}
        itemContent={(_, row) => (
          <>
            {columns.map((c) => (
              <td
                key={c.key}
                style={{ width: c.width, textAlign: c.align || 'left' }}
                className={clsx(
                  'px-2 py-1 truncate text-text-primary whitespace-nowrap max-w-0',
                  c.mono && 'tabular',
                )}
              >
                {c.render ? c.render(row) : row?.[c.key]}
              </td>
            ))}
          </>
        )}
      />
    </div>
  );
}

DataTable.propTypes = {
  rows: PropTypes.array.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      width: PropTypes.number,
      align: PropTypes.oneOf(['left', 'right', 'center']),
      render: PropTypes.func,
      mono: PropTypes.bool,
    }),
  ).isRequired,
  rowKey: PropTypes.func,
  onRowClick: PropTypes.func,
  selectedKey: PropTypes.string,
  className: PropTypes.string,
};
