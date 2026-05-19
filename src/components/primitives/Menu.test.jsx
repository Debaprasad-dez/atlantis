import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Menu } from './Menu';

const items = (onA = () => {}, onB = () => {}) => [
  { key: 'a', label: 'Alpha', onSelect: onA },
  { key: 'b', label: 'Bravo', danger: true, onSelect: onB },
];

describe('Menu', () => {
  it('MENU-01: trigger opens the menu', () => {
    render(<Menu items={items()} />);
    expect(screen.queryByText('Alpha')).toBeNull();
    fireEvent.click(screen.getByLabelText('Open menu'));
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('MENU-02: selecting an item fires onSelect and closes', async () => {
    const onA = vi.fn();
    render(<Menu items={items(onA)} />);
    fireEvent.click(screen.getByLabelText('Open menu'));
    fireEvent.click(screen.getByText('Alpha'));
    expect(onA).toHaveBeenCalled();
    // Closed afterwards
    expect(screen.queryByText('Alpha')).toBeNull();
  });

  it('MENU-03: Escape closes the menu', () => {
    render(<Menu items={items()} />);
    fireEvent.click(screen.getByLabelText('Open menu'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Alpha')).toBeNull();
  });

  it('MENU-04: disabled items do not fire onSelect', () => {
    const onA = vi.fn();
    render(
      <Menu
        items={[{ key: 'a', label: 'Alpha', disabled: true, onSelect: onA }]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Open menu'));
    fireEvent.click(screen.getByText('Alpha'));
    expect(onA).not.toHaveBeenCalled();
  });
});
