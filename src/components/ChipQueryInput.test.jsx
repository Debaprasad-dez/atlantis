import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChipQueryInput } from './ChipQueryInput';

describe('ChipQueryInput', () => {
  it('CQI-01: renders one chip per parsed clause', () => {
    render(<ChipQueryInput value="type:person risk:>80" onChange={() => {}} />);
    expect(screen.getByText('type')).toBeInTheDocument();
    expect(screen.getByText('risk')).toBeInTheDocument();
    expect(screen.getByText('person')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('CQI-02: × button removes a clause', () => {
    const onChange = vi.fn();
    render(<ChipQueryInput value="type:person risk:>80" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Remove type:person'));
    expect(onChange).toHaveBeenCalledWith('risk:>80');
  });

  it('CQI-03: typing + Enter commits draft', () => {
    const onChange = vi.fn();
    render(<ChipQueryInput value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/type:person/);
    fireEvent.change(input, { target: { value: 'tag:pep' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('tag:pep');
  });

  it('CQI-04: parser errors surface inline', () => {
    render(<ChipQueryInput value="xyz:1" onChange={() => {}} />);
    expect(screen.getByText(/Unknown field/)).toBeInTheDocument();
  });
});
