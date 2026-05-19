import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { db } from '@/db/schema';
import { useLiveStore } from '@/stores/liveStore';

const seedSources = () =>
  db.sources.bulkPut([
    { id: 's1', name: 'Wire feed', kind: 'wire_feed', recordCount: 10, lastSync: 0, status: 'healthy' },
    { id: 's2', name: 'KYC', kind: 'kyc', recordCount: 20, lastSync: 0, status: 'degraded' },
  ]);

const seedEntities = () =>
  db.entities.bulkPut([
    { id: 'E1', type: 'person', name: 'A', riskScore: 95, tags: [], country: 'US', attrs: {}, lat: 1, lng: 2, createdAt: 0, updatedAt: 0 },
  ]);

beforeEach(async () => {
  await seedSources();
  await seedEntities();
  useLiveStore.setState({
    feed: [{ id: 'X', kind: 'wire', entityId: 'E1', ts: Date.now(), severity: 'info', description: 'Hello world' }],
    anomalies: [],
    metrics: { sysLoad: 30, queryLatency: 41, ingestRate: 4, totalIngested: 100, alertsPending: 5 },
    sparks: { ingest: Array(60).fill(0), latency: Array(60).fill(0), load: Array(60).fill(0), alerts: Array(60).fill(0) },
  });
});

describe('Dashboard', () => {
  it('DASH-01: mounts all 14 tile titles', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    const titles = [
      'LIVE EVENT FEED',
      'ENTITY POPULATION',
      'TRANSACTIONS · LAST 24H',
      'GEOSPATIAL · HIGH-RISK',
      'TOP-RISK ENTITIES',
      'RELATIONSHIP PREVIEW',
      'ANOMALIES',
      'ACTIVE INVESTIGATIONS',
      'RISK DISTRIBUTION',
      'RECENT AUDIT',
      'ALERT SUMMARY',
      'DATA SOURCES',
      'QUERY PERFORMANCE',
    ];
    for (const t of titles) expect(await screen.findByText(t)).toBeInTheDocument();
  });

  it('DASH-02: SystemStatusStrip shows KPI labels', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    for (const label of ['RECORDS', 'INGEST RATE', 'Q-LATENCY', 'SYSTEM LOAD', 'ALERTS PENDING']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('DASH-03: LiveEventFeed renders the seeded row description', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByText('Hello world')).toBeInTheDocument();
  });

  it('DASH-04: EntityCounters shows counters per type', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    for (const t of ['PERSONS', 'ORGS', 'ACCOUNTS', 'TX', 'DEVICES', 'LOCATIONS']) {
      expect(await screen.findByText(t)).toBeInTheDocument();
    }
  });

  it('DASH-05: AlertSummaryTile shows CRIT / WARN / INFO', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    // Phase 3 added severity quick-filter chips with the same labels to the
    // Live Event Feed, so each label can appear more than once on the page.
    for (const t of ['CRITICAL', 'WARNING', 'INFO']) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
  });

  it('DASH-06: DataSourceHealthTile lists seeded sources', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByText('Wire feed')).toBeInTheDocument();
    expect(await screen.findByText('KYC')).toBeInTheDocument();
  });

  it('DASH-09: QueryPerfTile shows LAST/AVG/P-MAX', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByText('LAST')).toBeInTheDocument();
    expect(screen.getByText('AVG')).toBeInTheDocument();
    expect(screen.getByText('P-MAX')).toBeInTheDocument();
  });

  it('DASH-10: TimeSeriesChart shows its legend labels', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });
});
