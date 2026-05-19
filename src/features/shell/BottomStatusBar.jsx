import { useLiveStore } from '@/stores/liveStore';
import { useAuthStore } from '@/stores/authStore';
import { useEntityCount } from '@/hooks/useEntities';
import { fmtCompact, fmtRelative } from '@/lib/format';
import { useEffect, useState } from 'react';

const HINTS = [
  ['⌘K', 'Palette'],
  ['G E', 'Entities'],
  ['G D', 'Dashboard'],
  ['⇧?', 'Help'],
];

export function BottomStatusBar() {
  const total = useEntityCount();
  const user = useAuthStore((s) => s.user);
  const sysLoad = useLiveStore((s) => s.metrics.sysLoad);
  const queryLatency = useLiveStore((s) => s.metrics.queryLatency);
  const totalIngested = useLiveStore((s) => s.metrics.totalIngested);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <footer className="h-6 flex items-center bg-bg-elevated border-t border-border-emphasis text-micro uppercase tracking-wider text-text-muted px-2 gap-3 flex-shrink-0 overflow-hidden">
      <span className="flex items-center gap-1.5 flex-shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-success" />
        <span>OFFLINE-OK</span>
      </span>
      <span className="text-border-emphasis hidden sm:inline">│</span>
      <span className="flex-shrink-0">
        Records&nbsp;<span className="tabular text-text-secondary">{fmtCompact(total)}</span>
      </span>
      <span className="hidden sm:inline flex-shrink-0">
        Ingested&nbsp;<span className="tabular text-text-secondary">+{fmtCompact(totalIngested)}</span>
      </span>
      <span className="hidden md:inline flex-shrink-0">
        Load&nbsp;<span className="tabular text-text-secondary">{sysLoad}%</span>
      </span>
      <span className="hidden md:inline flex-shrink-0">
        Q-Lat&nbsp;<span className="tabular text-text-secondary">{queryLatency}ms</span>
      </span>
      <span className="text-border-emphasis hidden lg:inline">│</span>
      <span className="hidden lg:inline flex-shrink-0">
        Sync&nbsp;<span className="text-text-secondary">{fmtRelative(now - 1000 * 12)}</span>
      </span>
      <span className="text-border-emphasis hidden md:inline">│</span>
      <span className="hidden md:inline flex-shrink-0">
        USER&nbsp;<span className="text-text-secondary">{user?.name || '—'}</span>
      </span>
      <div className="flex-1" />
      <div className="hidden xl:flex items-center gap-2 flex-shrink-0">
        {HINTS.map(([k, l]) => (
          <span key={k} className="flex items-center gap-1">
            <kbd className="tabular text-micro border border-border-subtle px-1 text-text-secondary">
              {k}
            </kbd>
            <span>{l}</span>
          </span>
        ))}
      </div>
      <span className="text-border-emphasis hidden xl:inline">│</span>
      <span className="tabular text-text-secondary flex-shrink-0">{new Date(now).toISOString().slice(11, 19)}Z</span>
    </footer>
  );
}
