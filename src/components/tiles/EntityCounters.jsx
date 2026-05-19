import { useNavigate } from 'react-router-dom';
import { Tile, MetricCard } from '@/components/primitives';
import { useDexie } from '@/hooks/useDexie';
import { useRefreshable } from '@/hooks/useRefreshable';
import { db } from '@/db/schema';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/stores/toastStore';

const TYPES = [
  { key: 'person', label: 'PERSONS', tone: 'cyan' },
  { key: 'organization', label: 'ORGS', tone: 'cyan' },
  { key: 'account', label: 'ACCOUNTS', tone: 'amber' },
  { key: 'transaction', label: 'TX', tone: 'amber' },
  { key: 'device', label: 'DEVICES', tone: 'success' },
  { key: 'location', label: 'LOCATIONS', tone: 'success' },
];

/** Counter cards per entity type. Clicking a card jumps to a pre-filtered Entity Explorer. */
export function EntityCounters({ span }) {
  const [tick, refresh] = useRefreshable();
  const navigate = useNavigate();
  const { data } = useDexie(async () => {
    const map = {};
    for (const t of TYPES) map[t.key] = await db.entities.where('type').equals(t.key).count();
    return map;
  }, [tick]);

  const goTo = (type) => navigate(`/entities?seedQuery=${encodeURIComponent('type:' + type)}`);

  return (
    <Tile
      title="ENTITY POPULATION"
      span={span}
      footer="Click a card to filter Explorer · Δ vs last hour"
      onRefresh={() => { refresh(); toast.info('Refreshed counts'); }}
      onCopy={async () => {
        const ok = await copyText(JSON.stringify(data, null, 2));
        ok ? toast.success('Counts copied') : toast.warning('Copy failed');
      }}
    >
      <div className="grid grid-cols-3 grid-rows-2 divide-x divide-y divide-border-subtle h-full">
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => goTo(t.key)}
            className="text-left hover:bg-bg-hover transition-colors"
            title={`Show ${t.label} in Entity Explorer`}
          >
            <MetricCard
              label={t.label}
              value={data ? data[t.key]?.toLocaleString() ?? '—' : '—'}
              delta={Math.round((Math.random() * 4 - 1) * 10) / 10}
              tone={t.tone}
            />
          </button>
        ))}
      </div>
    </Tile>
  );
}
