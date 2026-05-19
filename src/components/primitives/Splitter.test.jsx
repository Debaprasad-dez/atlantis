import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Splitter } from './Splitter';

describe('Splitter', () => {
  it('SPLIT-01: renders both panes', () => {
    render(
      <div style={{ width: 800, height: 400 }}>
        <Splitter id="t1" initialSize={200}>
          <div>LEFT</div>
          <div>RIGHT</div>
        </Splitter>
      </div>,
    );
    expect(screen.getByText('LEFT')).toBeInTheDocument();
    expect(screen.getByText('RIGHT')).toBeInTheDocument();
  });

  it('SPLIT-02: exposes an accessible separator', () => {
    render(
      <div style={{ width: 800, height: 400 }}>
        <Splitter id="t2" initialSize={200}>
          <div>A</div>
          <div>B</div>
        </Splitter>
      </div>,
    );
    const sep = screen.getByRole('separator');
    expect(sep).toHaveAttribute('aria-orientation', 'vertical');
    expect(sep).toHaveAttribute('aria-label', 'Resize panel');
  });

  it('SPLIT-03: writes size to localStorage on mount', () => {
    localStorage.clear();
    render(
      <div style={{ width: 800, height: 400 }}>
        <Splitter id="persist-1" initialSize={222}>
          <div>A</div>
          <div>B</div>
        </Splitter>
      </div>,
    );
    expect(localStorage.getItem('atlantis.split.persist-1')).toBe('222');
  });

  it('SPLIT-04: reads previously-persisted size', () => {
    localStorage.setItem('atlantis.split.persist-2', '321');
    render(
      <div style={{ width: 800, height: 400 }}>
        <Splitter id="persist-2" initialSize={100}>
          <div>A</div>
          <div>B</div>
        </Splitter>
      </div>,
    );
    // On mount the effect re-persists the (loaded) value, so it should equal 321 not 100
    expect(localStorage.getItem('atlantis.split.persist-2')).toBe('321');
  });

  it('SPLIT-05: arrow keys resize the primary pane', () => {
    localStorage.clear();
    render(
      <div style={{ width: 800, height: 400 }}>
        <Splitter id="kbd" initialSize={200}>
          <div>A</div>
          <div>B</div>
        </Splitter>
      </div>,
    );
    const sep = screen.getByRole('separator');
    fireEvent.keyDown(sep, { key: 'ArrowRight' });
    expect(Number(localStorage.getItem('atlantis.split.kbd'))).toBeGreaterThan(200);
    fireEvent.keyDown(sep, { key: 'ArrowLeft', shiftKey: true });
    expect(Number(localStorage.getItem('atlantis.split.kbd'))).toBeLessThan(220);
  });

  it('SPLIT-06: double-click resets to initialSize', () => {
    localStorage.setItem('atlantis.split.reset', '400');
    render(
      <div style={{ width: 800, height: 400 }}>
        <Splitter id="reset" initialSize={224}>
          <div>A</div>
          <div>B</div>
        </Splitter>
      </div>,
    );
    fireEvent.doubleClick(screen.getByRole('separator'));
    expect(localStorage.getItem('atlantis.split.reset')).toBe('224');
  });
});
