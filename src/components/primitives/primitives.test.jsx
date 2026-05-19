import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Panel } from './Panel';
import { Tile } from './Tile';
import { LiveBadge } from './LiveBadge';
import { StatusIndicator } from './StatusIndicator';
import { MetricCard } from './MetricCard';
import { Sparkline } from './Sparkline';
import { RiskBar } from './RiskBar';
import { FilterChip } from './FilterChip';
import { Inspector, KV } from './Inspector';

describe('Panel', () => {
  it('PRIM-PNL-01: renders children', () => {
    render(<Panel><span>BODY</span></Panel>);
    expect(screen.getByText('BODY')).toBeInTheDocument();
  });
  it('PRIM-PNL-02: renders header content', () => {
    render(<Panel header={<span>HEAD</span>}><span>B</span></Panel>);
    expect(screen.getByText('HEAD')).toBeInTheDocument();
  });
  it('PRIM-PNL-03: renders footer content', () => {
    render(<Panel footer="FOOT"><span>B</span></Panel>);
    expect(screen.getByText('FOOT')).toBeInTheDocument();
  });
});

describe('Tile', () => {
  it('PRIM-TL-01: renders title uppercase via class (text is verbatim)', () => {
    render(<Tile title="DASH"><span>x</span></Tile>);
    expect(screen.getByRole('heading', { name: 'DASH' })).toBeInTheDocument();
  });
  it('PRIM-TL-02: shows LIVE badge when live', () => {
    render(<Tile title="X" live><span>y</span></Tile>);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });
  it('PRIM-TL-03: actions slot renders next to menu', () => {
    render(<Tile title="X" actions={<button>ACT</button>}><span>y</span></Tile>);
    expect(screen.getByText('ACT')).toBeInTheDocument();
  });
});

describe('LiveBadge', () => {
  it('PRIM-LB-01: live state has pulsing dot', () => {
    const { container } = render(<LiveBadge />);
    expect(container.querySelector('.animate-pulseDot')).toBeTruthy();
  });
  it('PRIM-LB-02: error state uses critical color', () => {
    const { container } = render(<LiveBadge state="error" />);
    expect(container.querySelector('.bg-accent-critical')).toBeTruthy();
  });
});

describe('StatusIndicator', () => {
  it('PRIM-SI-01: healthy uses success color', () => {
    const { container } = render(<StatusIndicator status="healthy" />);
    expect(container.querySelector('.bg-accent-success')).toBeTruthy();
  });
  it('PRIM-SI-02: renders label when provided', () => {
    render(<StatusIndicator status="offline" label="DOWN" />);
    expect(screen.getByText('DOWN')).toBeInTheDocument();
  });
});

describe('MetricCard', () => {
  it('PRIM-MC-01: renders label, value, unit, sparkline', () => {
    const { container } = render(
      <MetricCard label="RECS" value="12" unit="K" delta={1.2} spark={[1, 2, 3]} />,
    );
    expect(screen.getByText('RECS')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeTruthy();
  });
  it('PRIM-MC-02: negative delta → critical color', () => {
    render(<MetricCard label="X" value={1} delta={-3} />);
    const d = screen.getByText('-3.0%');
    expect(d.className).toMatch(/critical/);
  });
  it('PRIM-MC-03: positive delta gets a leading "+"', () => {
    render(<MetricCard label="X" value={1} delta={2.5} />);
    expect(screen.getByText('+2.5%')).toBeInTheDocument();
  });
});

describe('Sparkline', () => {
  it('PRIM-SP-01: renders a path for N values', () => {
    const { container } = render(<Sparkline values={[1, 2, 3, 4]} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
    expect(paths[1].getAttribute('d').split(' ').length).toBeGreaterThanOrEqual(4);
  });
  it('PRIM-SP-02: empty values does not throw', () => {
    expect(() => render(<Sparkline values={[]} />)).not.toThrow();
  });
});

describe('RiskBar', () => {
  it('PRIM-RB-01: high risk → critical tone', () => {
    const { container } = render(<RiskBar score={95} />);
    expect(container.querySelector('.bg-accent-critical')).toBeTruthy();
  });
  it('PRIM-RB-02: low risk → success tone', () => {
    const { container } = render(<RiskBar score={10} />);
    expect(container.querySelector('.bg-accent-success')).toBeTruthy();
  });
  it('PRIM-RB-03: above-100 clamps to 100% width', () => {
    const { container } = render(<RiskBar score={150} />);
    const bar = container.querySelector('.h-full');
    expect(bar.style.width).toBe('100%');
  });
});

describe('FilterChip', () => {
  it('PRIM-FC-01: onClick fires', () => {
    const onClick = vi.fn();
    render(<FilterChip label="X" onClick={onClick} />);
    fireEvent.click(screen.getByText('X').parentElement);
    expect(onClick).toHaveBeenCalled();
  });
  it('PRIM-FC-02: onRemove fires when × clicked', () => {
    const onRemove = vi.fn();
    render(<FilterChip label="X" onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove X'));
    expect(onRemove).toHaveBeenCalled();
  });
  it('PRIM-FC-03: × click does not bubble to onClick', () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(<FilterChip label="X" onClick={onClick} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove X'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Inspector + KV', () => {
  it('PRIM-INS-01: renders title and subtitle', () => {
    render(<Inspector title="Hello" subtitle="E01">x</Inspector>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('E01')).toBeInTheDocument();
  });
  it('PRIM-INS-02: close button calls onClose', () => {
    const onClose = vi.fn();
    render(<Inspector title="X" onClose={onClose}>x</Inspector>);
    fireEvent.click(screen.getByLabelText('Close inspector'));
    expect(onClose).toHaveBeenCalled();
  });
  it('PRIM-INS-03: KV renders label and value', () => {
    render(<KV label="TYPE" value="person" />);
    expect(screen.getByText('TYPE')).toBeInTheDocument();
    expect(screen.getByText('person')).toBeInTheDocument();
  });
});
