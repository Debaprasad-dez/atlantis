import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap, Rectangle } from 'react-leaflet';
import { FilterChip, Inspector, KV, RiskBar, Splitter } from '@/components/primitives';
import { useDexie } from '@/hooks/useDexie';
import { useRefreshable } from '@/hooks/useRefreshable';
import { useUIStore } from '@/stores/uiStore';
import { db } from '@/db/schema';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { fmtDateTime } from '@/lib/format';
import { REGIONS } from '@/lib/regions';

const LAYER_BASEMAPS = [
  { key: 'dark', label: 'DARK', url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png' },
  { key: 'darkLabels', label: 'DARK+LBL', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png' },
  { key: 'positron', label: 'LIGHT', url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png' },
];

function clusterPoints(points, gridDeg) {
  const cells = new Map();
  for (const p of points) {
    const cx = Math.floor(p.lat / gridDeg) * gridDeg + gridDeg / 2;
    const cy = Math.floor(p.lng / gridDeg) * gridDeg + gridDeg / 2;
    const key = `${cx.toFixed(2)},${cy.toFixed(2)}`;
    const c = cells.get(key) ?? { lat: cx, lng: cy, count: 0, sumRisk: 0, items: [] };
    c.count += 1;
    c.sumRisk += p.riskScore ?? 0;
    c.items.push(p);
    cells.set(key, c);
  }
  return [...cells.values()].map((c) => ({ ...c, avgRisk: c.sumRisk / c.count }));
}

function ZoomTracker({ onZoom }) {
  const map = useMap();
  useEffect(() => {
    onZoom(map.getZoom());
    const fn = () => onZoom(map.getZoom());
    map.on('zoomend', fn);
    return () => map.off('zoomend', fn);
  }, [map, onZoom]);
  return null;
}

/** Applies region bounds + minZoom constraints whenever the region changes. */
function RegionController({ region }) {
  const map = useMap();
  useEffect(() => {
    if (!region || !region.bounds) {
      map.setMinZoom(2);
      map.setMaxBounds(null);
      map.setView([20, 0], 2, { animate: true });
    } else {
      map.setMinZoom(region.minZoom ?? 4);
      map.setMaxBounds(region.bounds);
      map.fitBounds(region.bounds, { animate: true, padding: [20, 20] });
    }
  }, [map, region]);
  return null;
}

export default function GeoView() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const region = useUIStore((s) => s.region);
  const [tick, refresh] = useRefreshable();
  const [basemap, setBasemap] = useState('dark');
  const [showClusters, setShowClusters] = useState(true);
  const [riskMin, setRiskMin] = useState(60);
  const [zoom, setZoom] = useState(2);
  const [selected, setSelected] = useState(null);
  const [eventWindow, setEventWindow] = useState(7);
  const [cachedTiles, setCachedTiles] = useState(0);

  const { data: entities, loading } = useDexie(async () => {
    const out = [];
    await db.entities
      .where('riskScore')
      .above(riskMin)
      .limit(2000)
      .each((e) => {
        if (e.lat == null || e.lng == null) return;
        // If a region with bounds is active, only show points within it
        if (region?.bounds) {
          const [[s, w], [n, e2]] = region.bounds;
          if (e.lat < s || e.lat > n || e.lng < w || e.lng > e2) return;
        }
        out.push(e);
      });
    return out;
  }, [tick, riskMin, region]);

  const { data: events } = useDexie(async () => {
    const since = Date.now() - eventWindow * 24 * 60 * 60 * 1000;
    const out = [];
    await db.events
      .orderBy('ts')
      .reverse()
      .until(() => out.length >= 500)
      .each((e) => {
        if (e.ts < since) return;
        out.push(e);
      });
    return out;
  }, [eventWindow, tick]);

  useEffect(() => {
    db.tileCache.count().then(setCachedTiles).catch(() => setCachedTiles(0));
  }, [tick]);

  const points = useMemo(() => entities ?? [], [entities]);
  const gridDeg = useMemo(() => Math.max(1, 90 / Math.pow(2, zoom)), [zoom]);
  const clusters = useMemo(
    () => (showClusters ? clusterPoints(points, gridDeg) : []),
    [points, gridDeg, showClusters],
  );

  const cacheVisibleRegion = async () => {
    const z = 2;
    const writes = [];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        writes.push(db.tileCache.put({ z, x, y, fetchedAt: Date.now(), updatedAt: Date.now(), bytes: 0 }));
      }
    }
    await Promise.all(writes);
    const c = await db.tileCache.count();
    setCachedTiles(c);
    audit(user?.id, 'cache_tiles', null, { z, count: writes.length });
    toast.success(`Cached ${writes.length} placeholders @ z=${z}`);
  };

  const clearTileCache = async () => {
    await db.tileCache.clear();
    setCachedTiles(0);
    toast.info('Tile cache cleared');
  };

  const activeRegionLabel = region ? region.name : 'Global';

  return (
    <div className="h-full flex flex-col bg-bg-base">
      <div className="h-9 flex items-center gap-3 px-2 bg-bg-elevated border-b border-border-subtle flex-shrink-0">
        <span className="section-label">GEOSPATIAL</span>
        {region && (
          <span className="chip text-accent-primary border-accent-primary/30">
            ◉ {activeRegionLabel}
          </span>
        )}
        <span className="tabular text-micro text-text-muted">
          {loading ? 'loading…' : `${points.length} points · ${clusters.length} clusters · zoom ${zoom}`}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {LAYER_BASEMAPS.map((b) => (
            <FilterChip key={b.key} label={b.label} active={basemap === b.key} onClick={() => setBasemap(b.key)} />
          ))}
        </div>
        <FilterChip label="CLUSTERS" active={showClusters} onClick={() => setShowClusters((s) => !s)} />
        <button type="button" className="btn h-7" onClick={refresh}>↻</button>
      </div>

      <div className="flex-1 min-h-0">
        <Splitter id="geo.controls" direction="row" primary="first" initialSize={224} minSize={180} maxSize={380}>
        <aside className="h-full bg-bg-panel border-r border-border-subtle overflow-auto">
          <div className="section-label px-2 py-1.5 border-b border-border-subtle">RISK THRESHOLD</div>
          <div className="px-2 py-2">
            <input type="range" min="0" max="100" value={riskMin} onChange={(e) => setRiskMin(+e.target.value)} className="w-full accent-accent-primary" />
            <div className="flex justify-between text-micro tabular text-text-muted mt-1">
              <span>min</span><span>{riskMin}</span>
            </div>
          </div>

          <div className="section-label px-2 py-1.5 border-y border-border-subtle">EVENT WINDOW</div>
          <div className="px-2 py-2">
            <input type="range" min="1" max="30" value={eventWindow} onChange={(e) => setEventWindow(+e.target.value)} className="w-full accent-accent-primary" />
            <div className="flex justify-between text-micro tabular text-text-muted mt-1">
              <span>days</span><span>{eventWindow}</span>
            </div>
          </div>

          <div className="section-label px-2 py-1.5 border-y border-border-subtle">REGION FILTER</div>
          <div className="px-2 py-2 space-y-0.5">
            {REGIONS.map((r) => (
              <div
                key={r.code}
                className={`px-2 py-1 text-xs cursor-default flex items-center gap-2 ${
                  (region?.code ?? 'GLOBAL') === r.code
                    ? 'text-accent-primary bg-accent-primary/5'
                    : 'text-text-secondary'
                }`}
              >
                <span className="mono text-micro text-text-muted w-10">{r.code}</span>
                <span>{r.name}</span>
              </div>
            ))}
            <p className="text-micro text-text-muted mt-1">Set region in the top bar.</p>
          </div>

          <div className="section-label px-2 py-1.5 border-y border-border-subtle">OFFLINE TILES</div>
          <div className="px-2 py-2 space-y-1">
            <div className="flex items-center justify-between text-micro tabular">
              <span className="text-text-muted">cached</span>
              <span className="text-text-secondary">{cachedTiles}</span>
            </div>
            <button type="button" className="btn h-6 w-full" onClick={cacheVisibleRegion}>
              CACHE WORLD z=2
            </button>
            <button type="button" className="btn btn-danger h-6 w-full" onClick={clearTileCache} disabled={cachedTiles === 0}>
              CLEAR CACHE
            </button>
          </div>

          <div className="section-label px-2 py-1.5 border-y border-border-subtle">RECENT EVENTS</div>
          <ul className="overflow-auto max-h-48">
            {(events ?? []).slice(0, 20).map((e) => (
              <li key={e.id} className="px-2 py-1 border-b border-border-subtle/40 text-micro">
                <div className="flex justify-between">
                  <span className="section-label text-viz-cyan">{e.kind}</span>
                  <span className="tabular text-text-muted">{fmtDateTime(e.ts)}</span>
                </div>
                <div className="text-text-secondary truncate">{e.description}</div>
              </li>
            ))}
            {(events ?? []).length === 0 && (
              <li className="px-2 py-2 text-micro text-text-muted">No events in window.</li>
            )}
          </ul>
        </aside>

        <Splitter id="geo.inspector" direction="row" primary="second" initialSize={320} minSize={240} maxSize={520}>
        <main className="h-full min-w-0 relative">
          <MapContainer
            center={region?.center ?? [20, 0]}
            zoom={region?.zoom ?? 2}
            minZoom={region?.minZoom ?? 2}
            maxBounds={region?.bounds ?? undefined}
            worldCopyJump={!region}
            attributionControl={false}
            style={{ height: '100%', width: '100%', background: '#0A0E14' }}
          >
            <RegionController region={region} />
            <ZoomTracker onZoom={setZoom} />
            <TileLayer url={LAYER_BASEMAPS.find((b) => b.key === basemap).url} />
            {showClusters
              ? clusters.map((c, i) => (
                  <CircleMarker
                    key={i}
                    center={[c.lat, c.lng]}
                    radius={Math.min(28, 6 + Math.sqrt(c.count) * 2.5)}
                    eventHandlers={{
                      click: () => {
                        setSelected(c.items[0]);
                        audit(user?.id, 'view_cluster', null, { count: c.count });
                      },
                    }}
                    pathOptions={{
                      color: c.avgRisk > 85 ? '#FF4747' : c.avgRisk > 70 ? '#FFB627' : '#00D9FF',
                      fillColor: c.avgRisk > 85 ? '#FF4747' : c.avgRisk > 70 ? '#FFB627' : '#00D9FF',
                      fillOpacity: 0.35,
                      weight: 1.2,
                    }}
                  >
                    <Tooltip>
                      <span className="tabular">{c.count} entities</span> · avg risk {c.avgRisk.toFixed(0)}
                    </Tooltip>
                  </CircleMarker>
                ))
              : points.map((p) => (
                  <CircleMarker
                    key={p.id}
                    center={[p.lat, p.lng]}
                    radius={Math.max(2, Math.min(8, p.riskScore / 14))}
                    eventHandlers={{
                      click: () => {
                        setSelected(p);
                        audit(user?.id, 'view_entity', p.id, { context: 'geo' });
                      },
                    }}
                    pathOptions={{
                      color: p.riskScore > 85 ? '#FF4747' : '#FFB627',
                      fillColor: p.riskScore > 85 ? '#FF4747' : '#FFB627',
                      fillOpacity: 0.45,
                      weight: 1,
                    }}
                  >
                    <Tooltip><span className="tabular">{p.name}</span> · risk {p.riskScore}</Tooltip>
                  </CircleMarker>
                ))}
          </MapContainer>
        </main>

        <Inspector
          className="h-full"
          title={selected?.name || 'Click a marker'}
          subtitle={selected?.id}
          onClose={() => setSelected(null)}
        >
          {selected ? (
            <div>
              <KV label="TYPE" value={selected.type} />
              <KV label="COUNTRY" value={selected.country} mono />
              <KV label="RISK" value={<RiskBar score={selected.riskScore} />} />
              <KV label="LAT" value={selected.lat?.toFixed(4)} mono />
              <KV label="LNG" value={selected.lng?.toFixed(4)} mono />
              <div className="flex gap-1 px-2.5 py-2 border-t border-border-subtle">
                <button
                  type="button"
                  className="btn h-6 flex-1"
                  onClick={() => navigate(`/entities?focus=${selected.id}`)}
                >
                  OPEN ENTITY →
                </button>
                <button
                  type="button"
                  className="btn h-6 flex-1"
                  onClick={() => navigate(`/graph?focus=${selected.id}`)}
                >
                  GRAPH →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 text-xs text-text-muted">
              Click a cluster or marker to inspect. Toggle CLUSTERS to switch between aggregated and per-entity views.
            </div>
          )}
        </Inspector>
        </Splitter>
        </Splitter>
      </div>
    </div>
  );
}
