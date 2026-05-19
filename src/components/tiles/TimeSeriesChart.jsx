import { useMemo, useRef, useState } from 'react';
import { Tile, FilterChip } from '@/components/primitives';
import { useLiveStore } from '@/stores/liveStore';
import { copyText } from '@/lib/clipboard';
import { toCSV, downloadCSV } from '@/lib/csv';
import { toast } from '@/stores/toastStore';
import { fmtTime } from '@/lib/format';

const RANGES = [
  { key: '24h', label: '24H', points: 96, bucketMs: 15 * 60 * 1000 },
  { key: '7d', label: '7D', points: 84, bucketMs: 2 * 60 * 60 * 1000 },
  { key: '30d', label: '30D', points: 120, bucketMs: 6 * 60 * 60 * 1000 },
];

/** Synthetic time-series with range picker, hover crosshair, and copy/export. */
export function TimeSeriesChart({ span, width = 520, height = 160 }) {
  const sparkIngest = useLiveStore((s) => s.sparks.ingest);
  const sparkAlerts = useLiveStore((s) => s.sparks.alerts);
  const [rangeKey, setRangeKey] = useState('24h');
  const [hover, setHover] = useState(null);
  const range = RANGES.find((r) => r.key === rangeKey);
  const svgRef = useRef(null);

  const data = useMemo(() => {
    const out = [];
    let v1 = 40 + Math.random() * 30;
    let v2 = 4 + Math.random() * 3;
    for (let i = 0; i < range.points; i++) {
      v1 += (Math.random() - 0.5) * 18;
      v1 = Math.max(5, Math.min(140, v1));
      v2 += (Math.random() - 0.5) * 2;
      v2 = Math.max(0, Math.min(30, v2));
      out.push([v1, v2]);
    }
    return out;
  }, [rangeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const W = width;
  const H = height - 24;
  const max1 = Math.max(...data.map((d) => d[0]));
  const max2 = Math.max(...data.map((d) => d[1]));
  const x = (i) => (i / (data.length - 1)) * W;
  const y1 = (v) => H - (v / max1) * H;
  const y2 = (v) => H - (v / Math.max(1, max2)) * H;

  const path = (vals, scale) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${scale(v).toFixed(1)}`).join(' ');

  const onMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.min(data.length - 1, Math.max(0, Math.round((px / W) * (data.length - 1))));
    const tsAgo = (1 - i / (data.length - 1)) * range.points * range.bucketMs;
    setHover({ i, txn: data[i][0], alerts: data[i][1], tsAgo });
  };

  const copyJSON = async () => {
    const ok = await copyText(JSON.stringify(data, null, 2));
    ok ? toast.success(`Copied ${data.length} points`) : toast.warning('Copy failed');
  };
  const exportCSV = () => {
    const csv = toCSV(
      data.map(([t, a], i) => ({ i, transactions: t, alerts: a })),
      [{ key: 'i' }, { key: 'transactions' }, { key: 'alerts' }],
    );
    downloadCSV(`atlantis-timeseries-${rangeKey}-${Date.now()}.csv`, csv);
  };

  return (
    <Tile
      title="TRANSACTIONS · LAST 24H"
      span={span}
      live
      footer={`${data.length} buckets · hover for values · ${rangeKey.toUpperCase()}`}
      actions={
        <div className="flex items-center gap-0.5">
          {RANGES.map((r) => (
            <FilterChip key={r.key} label={r.label} active={r.key === rangeKey} onClick={() => setRangeKey(r.key)} />
          ))}
        </div>
      }
      menuItems={[
        { key: 'copy', label: 'Copy data (JSON)', icon: '⧉', onSelect: copyJSON },
        { key: 'export', label: 'Export CSV', icon: '↧', onSelect: exportCSV },
        { key: 'reseed', label: 'Resample series', icon: '↻', onSelect: () => setRangeKey((k) => k) },
      ]}
    >
      <div className="p-2 h-full flex flex-col">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H + 16}`}
          preserveAspectRatio="none"
          className="w-full flex-1 min-h-0"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {[0.25, 0.5, 0.75].map((t) => (
            <line key={t} x1={0} x2={W} y1={H * t} y2={H * t} stroke="#1F2937" strokeDasharray="2 3" />
          ))}
          <path d={`${path(data.map((d) => d[1]), y2)} L${W},${H} L0,${H} Z`} fill="rgba(255,71,71,0.10)" />
          <path d={path(data.map((d) => d[1]), y2)} fill="none" stroke="#FF4747" strokeWidth={1} />
          <path d={`${path(data.map((d) => d[0]), y1)} L${W},${H} L0,${H} Z`} fill="rgba(0,217,255,0.10)" />
          <path d={path(data.map((d) => d[0]), y1)} fill="none" stroke="#00D9FF" strokeWidth={1.25} />
          {hover ? (
            <g>
              <line x1={x(hover.i)} x2={x(hover.i)} y1={0} y2={H} stroke="#00D9FF" strokeOpacity="0.4" strokeWidth={0.7} />
              <circle cx={x(hover.i)} cy={y1(hover.txn)} r={2.5} fill="#00D9FF" />
              <circle cx={x(hover.i)} cy={y2(hover.alerts)} r={2} fill="#FF4747" />
            </g>
          ) : null}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const label = rangeKey === '24h'
              ? `-${Math.floor((1 - t) * 24)}h`
              : rangeKey === '7d'
                ? `-${Math.floor((1 - t) * 7)}d`
                : `-${Math.floor((1 - t) * 30)}d`;
            return (
              <text key={t} x={t * W} y={H + 12} fill="#64748B" fontSize="9" fontFamily="JetBrains Mono"
                    textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}>
                {label}
              </text>
            );
          })}
        </svg>
        <div className="flex items-center gap-3 mt-1 text-micro uppercase tracking-wider flex-shrink-0">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 bg-accent-primary" /> <span className="text-text-secondary">Transactions</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 bg-accent-critical" /> <span className="text-text-secondary">Alerts</span>
          </span>
          {hover ? (
            <span className="ml-auto tabular text-text-secondary">
              Txn <span className="text-accent-primary">{hover.txn.toFixed(0)}</span>
              {' · '}Alerts <span className="text-accent-critical">{hover.alerts.toFixed(1)}</span>
              {' · '}{fmtTime(Date.now() - hover.tsAgo)}
            </span>
          ) : (
            <span className="ml-auto tabular text-text-muted">
              live: {sparkIngest[sparkIngest.length - 1]} / {sparkAlerts[sparkAlerts.length - 1]}
            </span>
          )}
        </div>
      </div>
    </Tile>
  );
}
