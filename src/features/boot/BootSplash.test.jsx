import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BootSplash from './BootSplash';

describe('BootSplash', () => {
  it('BOOT-SP-01: shows the stage name', () => {
    render(<BootSplash stage="entities" done={1000} total={5000} />);
    expect(screen.getByText('entities')).toBeInTheDocument();
  });

  it('BOOT-SP-02: progress bar width matches done/total', () => {
    const { container } = render(<BootSplash stage="entities" done={1000} total={4000} />);
    const bar = container.querySelector('.bg-accent-primary.transition-all');
    expect(bar.style.width).toBe('25%');
  });

  it('BOOT-SP-03: renders error message', () => {
    render(<BootSplash stage="x" done={0} total={1} error="kaboom" />);
    expect(screen.getByText('kaboom')).toBeInTheDocument();
  });
});
