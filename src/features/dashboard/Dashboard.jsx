import {
  SystemStatusStrip,
  LiveEventFeed,
  EntityCounters,
  TimeSeriesChart,
  GeoHeatmap,
  TopEntitiesTile,
  GraphPreviewTile,
  AnomalyScoreTile,
  InvestigationsTile,
  DistributionTile,
  AuditTile,
  AlertSummaryTile,
  DataSourceHealthTile,
  QueryPerfTile,
} from '@/components/tiles';
import './dashboard.css';

/**
 * Dashboard — responsive layout via CSS media queries on a single grid.
 *
 *   ≥1280px : 12-col × 12-row explicit grid-areas (canonical layout)
 *   768-1279: 6-col reflow grid, areas re-mapped
 *   <768   : single-column stack (tiles render at their natural height)
 *
 * Tiles render once and the grid template changes around them. Each tile owns
 * a `grid-area:<name>` class that's applied at all breakpoints; the CSS picks
 * which area definition is active.
 */
export default function Dashboard() {
  return (
    <div className="flex flex-col h-full p-1.5 gap-1.5 bg-bg-base overflow-auto">
      <SystemStatusStrip />
      <div className="dashboard-grid flex-1">
        <TimeSeriesChart      span="dash-ts" />
        <GeoHeatmap           span="dash-geo" />
        <LiveEventFeed        span="dash-feed" />
        <EntityCounters       span="dash-cnt" />
        <AlertSummaryTile     span="dash-alt" />
        <DistributionTile     span="dash-dist" />
        <AnomalyScoreTile     span="dash-anom" />
        <QueryPerfTile        span="dash-qp" />
        <TopEntitiesTile      span="dash-top" />
        <GraphPreviewTile     span="dash-gph" />
        <InvestigationsTile   span="dash-inv" />
        <DataSourceHealthTile span="dash-src" />
        <AuditTile            span="dash-aud" />
      </div>
    </div>
  );
}
