import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('MODAL-01: renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="X">body</Modal>);
    expect(screen.queryByText('X')).toBeNull();
  });

  it('MODAL-02: renders title + body + close X when open', () => {
    render(<Modal open onClose={() => {}} title="HELLO">body</Modal>);
    expect(screen.getByText('HELLO')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('MODAL-03: close button fires onClose', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="X">body</Modal>);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('MODAL-04: Escape fires onClose', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="X">body</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
