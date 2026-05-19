import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { Tile } from '@/components/primitives';
import { useDexie } from '@/hooks/useDexie';
import { useRefreshable } from '@/hooks/useRefreshable';
import { useUIStore } from '@/stores/uiStore';
import { db } from '@/db/schema';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';

/** Syncs map view and constraints whenever region changes. */
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
      map.fitBounds(region.bounds, { animate: true, padding: [10, 10] });
    }
  }, [map, region]);
  return null;
}

export function GeoHeatmap({ span }) {
  const [tick, refresh] = useRefreshable();
  const [threshold, setThreshold] = useState(70);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const region = useUIStore((s) => s.region);

  const { data, loading } = useDexie(async () => {
    const out = [];
    await db.entities
      .where('riskScore')
      .above(threshold)
      .limit(400)
      .each((e) => {
        if (e.lat == null || e.lng == null) return;
        if (region?.bounds) {
          const [[s, w], [n, e2]] = region.bounds;
          if (e.lat < s || e.lat > n || e.lng < w || e.lng > e2) return;
        }
        out.push(e);
      });
    return out;
  }, [tick, threshold, region]);

  const points = useMemo(() => data ?? [], [data]);

  const openMarker = (p) => {
    audit(user?.id, 'view_entity', p.id, { from: 'geo_tile' });
    navigate(`/entities?focus=${p.id}`);
  };

  const regionLabel = region ? ` · ${region.name}` : '';

  return (
    <Tile
      title={`GEOSPATIAL · HIGH-RISK${regionLabel}`}
      span={span}
      loading={loading}
      footer={`${points.length} points · risk > ${threshold} · click marker to inspect`}
      onRefresh={() => refresh()}
      onExpand={() => navigate('/map')}
      menuItems={[
        { key: 'open', label: 'Open full-screen map →', icon: '⛶', onSelect: () => navigate('/map') },
        { key: 't+', label: 'Raise threshold (+5)', icon: '↑', onSelect: () => setThreshold((t) => Math.min(99, t + 5)) },
        { key: 't-', label: 'Lower threshold (-5)', icon: '↓', onSelect: () => setThreshold((t) => Math.max(0, t - 5)) },
        { key: 'refresh', label: 'Refresh', icon: '↻', onSelect: refresh },
      ]}
    >
      <div className="h-full w-full relative">
        <MapContainer
          center={region?.center ?? [20, 0]}
          zoom={region?.zoom ?? 2}
          minZoom={region?.minZoom ?? 2}
          maxBounds={region?.bounds ?? undefined}
          worldCopyJump={!region}
          attributionControl={false}
          zoomControl={false}
          style={{ height: '100%', width: '100%', background: '#0A0E14' }}
        >
          <RegionController region={region} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png" />
          {points.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={Math.max(2, Math.min(8, p.riskScore / 14))}
              eventHandlers={{ click: () => openMarker(p) }}
              pathOptions={{
                color: p.riskScore > 85 ? '#FF4747' : '#FFB627',
                fillColor: p.riskScore > 85 ? '#FF4747' : '#FFB627',
                fillOpacity: 0.45,
                weight: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -2]} opacity={0.9}>
                <span className="tabular">{p.name}</span> · risk {p.riskScore}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </Tile>
  );
}
