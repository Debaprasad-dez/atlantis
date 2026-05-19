import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tile } from '@/components/primitives';
import { useLiveStore } from '@/stores/liveStore';
import { fmtCompact } from '@/lib/format';
import { toast } from '@/stores/toastStore';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';

export function AlertSummaryTile({ span }) {
  const feed = useLiveStore((s) => s.feed);
  const anoms = useLiveStore((s) => s.anomalies);
  const acknowledgeAlerts = useLiveStore((s) => s.acknowledgeAlerts);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0 };
    feed.forEach((e) => (c[e.severity] = (c[e.severity] || 0) + 1));
    anoms.forEach((a) => {
      if (a.severity === 'critical') c.critical++;
      else if (a.severity === 'high' || a.severity === 'medium') c.warning++;
      else c.info++;
    });
    return c;
  }, [feed, anoms]);

  const acknowledge = () => {
    acknowledgeAlerts();
    audit(user?.id, 'ack_alerts', null, counts);
    toast.success('Alerts acknowledged');
  };

  const items = [
    { label: 'CRITICAL', value: counts.critical, tone: 'bg-accent-critical', text: 'text-accent-critical', to: '/anomalies?severity=critical' },
    { label: 'WARNING', value: counts.warning, tone: 'bg-accent-warning', text: 'text-accent-warning', to: '/anomalies?severity=high' },
    { label: 'INFO', value: counts.info, tone: 'bg-accent-primary', text: 'text-accent-primary', to: '/anomalies' },
  ];

  return (
    <Tile
      title="ALERT SUMMARY"
      span={span}
      footer="Click a tier to drill in · rolling 200-event window"
      menuItems={[
        { key: 'ack', label: 'Acknowledge all', icon: '✓', onSelect: acknowledge },
        { key: 'open', label: 'Open Anomalies →', icon: '↗', onSelect: () => navigate('/anomalies') },
      ]}
    >
      <div className="grid grid-cols-3 divide-x divide-border-subtle h-full">
        {items.map((i) => (
          <button
            key={i.label}
            type="button"
            onClick={() => navigate(i.to)}
            className="flex flex-col items-center justify-center gap-1 hover:bg-bg-hover transition-colors"
          >
            <span className={`h-2 w-2 rounded-full ${i.tone} ${i.value > 0 ? 'animate-pulseDot' : 'opacity-40'}`} />
            <span className={`tabular text-xl font-semibold ${i.text}`}>{fmtCompact(i.value)}</span>
            <span className="section-label">{i.label}</span>
          </button>
        ))}
      </div>
    </Tile>
  );
}
