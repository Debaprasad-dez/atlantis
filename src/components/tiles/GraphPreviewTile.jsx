import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tile } from '@/components/primitives';
import { useDexie } from '@/hooks/useDexie';
import { useRefreshable } from '@/hooks/useRefreshable';
import { db } from '@/db/schema';
import { toast } from '@/stores/toastStore';

/**
 * Small force-directed network preview. Clicking a node deep-links into the
 * full Graph View with the node id pre-focused.
 */
export function GraphPreviewTile({ span }) {
  const ref = useRef(null);
  const fgRef = useRef(null);
  const navigate = useNavigate();
  const [size, setSize] = useState({ w: 320, h: 200 });
  const [ForceGraph, setForceGraph] = useState(null);
  const [tick, refresh] = useRefreshable();

  useEffect(() => {
    import('react-force-graph-2d').then((m) => setForceGraph(() => m.default));
  }, []);

  useEffect(() => {
    if (!ref.current) return undefined;
    const el = ref.current;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { data, loading } = useDexie(async () => {
    const rels = await db.relationships.limit(60).toArray();
    const ids = new Set();
    rels.forEach((r) => {
      ids.add(r.sourceId);
      ids.add(r.targetId);
    });
    const entities = await db.entities.where('id').anyOf([...ids]).toArray();
    return {
      nodes: entities.map((e) => ({ id: e.id, name: e.name, type: e.type, risk: e.riskScore })),
      links: rels.map((r) => ({ source: r.sourceId, target: r.targetId, kind: r.kind })),
    };
  }, [tick]);

  const graphData = useMemo(() => data ?? { nodes: [], links: [] }, [data]);

  return (
    <Tile
      title="RELATIONSHIP PREVIEW"
      span={span}
      loading={loading}
      footer={`${graphData.nodes.length} nodes · ${graphData.links.length} edges · click a node`}
      onRefresh={() => { refresh(); toast.info('Resampled relationships'); }}
      onExpand={() => navigate('/graph')}
      menuItems={[
        { key: 'open', label: 'Open Graph View →', icon: '↗', onSelect: () => navigate('/graph') },
        { key: 'fit', label: 'Zoom to fit', icon: '⤡', onSelect: () => fgRef.current?.zoomToFit?.(400) },
        { key: 'refresh', label: 'Resample', icon: '↻', onSelect: refresh },
      ]}
    >
      <div ref={ref} className="h-full w-full">
        {ForceGraph && data ? (
          <ForceGraph
            ref={fgRef}
            graphData={graphData}
            width={size.w}
            height={size.h}
            backgroundColor="#0F1419"
            nodeRelSize={3}
            nodeColor={(n) => (n.risk > 80 ? '#FF4747' : n.risk > 60 ? '#FFB627' : '#00D9FF')}
            linkColor={() => 'rgba(148,163,184,0.25)'}
            linkWidth={0.4}
            enableNodeDrag={false}
            cooldownTicks={50}
            onNodeClick={(n) => navigate(`/graph?focus=${n.id}`)}
          />
        ) : (
          <div className="h-full grid place-items-center text-micro text-text-muted">
            Loading graph…
          </div>
        )}
      </div>
    </Tile>
  );
}
