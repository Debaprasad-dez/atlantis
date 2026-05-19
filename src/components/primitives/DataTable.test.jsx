import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from './DataTable';

const rows = [
  { id: 'A', name: 'Alpha', score: 10 },
  { id: 'B', name: 'Bravo', score: 30 },
  { id: 'C', name: 'Charlie', score: 20 },
];
const cols = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'NAME' },
  { key: 'score', label: 'SCORE' },
];

describe('DataTable', () => {
  it('PRIM-DT-01: renders header labels', () => {
    render(<DataTable rows={rows} columns={cols} rowKey={(r) => r.id} />);
    for (const l of ['ID', 'NAME', 'SCORE']) expect(screen.getByText(l)).toBeInTheDocument();
  });

  it('PRIM-DT-02: row click invokes onRowClick', () => {
    const onRowClick = vi.fn();
    render(<DataTable rows={rows} columns={cols} rowKey={(r) => r.id} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Alpha'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('PRIM-DT-03: sort header toggles direction indicator', () => {
    render(<DataTable rows={rows} columns={cols} rowKey={(r) => r.id} />);
    // Re-query the header each click; after sort, the text node 'SCORE' is
    // wrapped alongside an indicator span and a single 'SCORE' match no longer exists.
    const clickScore = () =>
      fireEvent.click(screen.getByRole('columnheader', { name: /SCORE/ }));
    clickScore();
    expect(screen.getByText('▲')).toBeInTheDocument();
    clickScore();
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('PRIM-DT-04: empty rows does not crash', () => {
    expect(() => render(<DataTable rows={[]} columns={cols} rowKey={(r) => r.id} />)).not.toThrow();
  });
});
