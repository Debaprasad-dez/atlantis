import { Tile, Sparkline } from '@/components/primitives';
import { useLiveStore } from '@/stores/liveStore';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/stores/toastStore';

export function QueryPerfTile({ span }) {
  const sparks = useLiveStore((s) => s.sparks.latency);
  const last = sparks[sparks.length - 1] ?? 0;
  const avg = sparks.reduce((a, b) => a + b, 0) / Math.max(1, sparks.length);
  const max = Math.max(...sparks);
  const min = Math.min(...sparks);

  return (
    <Tile
      title="QUERY PERFORMANCE"
      span={span}
      live
      footer="Rolling 60-sample window · synthetic ticks"
      onCopy={async () => {
        const ok = await copyText(JSON.stringify({ last, avg, min, max, samples: sparks }, null, 2));
        ok ? toast.success('Latency series copied') : toast.warning('Copy failed');
      }}
      menuItems={[
        {
          key: 'reset',
          label: 'Reset window',
          icon: '⌫',
          onSelect: () =>
            useLiveStore.setState((s) => ({ sparks: { ...s.sparks, latency: Array(60).fill(0) } })),
        },
      ]}
    >
      <div className="h-full p-2 flex flex-col gap-2 justify-between">
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <div className="section-label">LAST</div>
            <div className="tabular text-lg text-accent-primary">{last}<span className="text-micro text-text-muted ml-1">ms</span></div>
          </div>
          <div>
            <div className="section-label">AVG</div>
            <div className="tabular text-lg text-text-primary">{avg.toFixed(0)}<span className="text-micro text-text-muted ml-1">ms</span></div>
          </div>
          <div>
            <div className="section-label">MIN</div>
            <div className="tabular text-lg text-accent-success">{min}<span className="text-micro text-text-muted ml-1">ms</span></div>
          </div>
          <div>
            <div className="section-label">P-MAX</div>
            <div className="tabular text-lg text-accent-warning">{max}<span className="text-micro text-text-muted ml-1">ms</span></div>
          </div>
        </div>
        <div className="flex-1 grid place-items-center">
          <Sparkline values={sparks} width={260} height={48} />
        </div>
      </div>
    </Tile>
  );
}
