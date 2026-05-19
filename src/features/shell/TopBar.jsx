import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useLiveStore } from '@/stores/liveStore';
import { LiveBadge } from '@/components/primitives';
import { fmtCompact } from '@/lib/format';
import { REGIONS } from '@/lib/regions';

/**
 * Global top bar — brand, global search, command palette, live status, alerts,
 * region selector, theme toggle, user.
 */
export function TopBar() {
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const region = useUIStore((s) => s.region);
  const setRegion = useUIStore((s) => s.setRegion);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const alertsPending = useLiveStore((s) => s.metrics.alertsPending);
  const ingestRate = useLiveStore((s) => s.metrics.ingestRate);

  const [regionOpen, setRegionOpen] = useState(false);
  const regionRef = useRef(null);

  // Sync theme class to <html>
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.add('theme-light');
    } else {
      html.classList.remove('theme-light');
    }
  }, [theme]);

  // Close region dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (regionRef.current && !regionRef.current.contains(e.target)) {
        setRegionOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeRegion = region ?? REGIONS[0];

  const selectRegion = (r) => {
    setRegion(r.code === 'GLOBAL' ? null : r);
    setRegionOpen(false);
  };

  return (
    <header className="h-9 flex items-center bg-bg-elevated border-b border-border-emphasis px-2 gap-3 flex-shrink-0 min-w-0">
      {/* Brand */}
      <div className="flex items-center gap-2 pr-2 border-r border-border-subtle h-full flex-shrink-0">
        <div className="h-4 w-4 border border-accent-primary relative">
          <div className="absolute inset-0.5 bg-accent-primary/30" />
        </div>
        <span className="text-sm font-semibold tracking-wider text-text-primary">ATLANTIS</span>
        <span className="text-micro text-text-muted uppercase tracking-wider hidden md:inline">FRAUD&nbsp;INTEL</span>
      </div>

      {/* Search */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex items-center gap-2 h-6 px-2 bg-bg-base border border-border-subtle hover:border-border-emphasis text-text-secondary hover:text-text-primary text-xs flex-1 max-w-[20rem] transition-colors min-w-0"
      >
        <span className="text-text-muted flex-shrink-0">⌕</span>
        <span className="flex-1 text-left truncate">
          <span className="hidden sm:inline">Search entities, events, actions…</span>
          <span className="sm:hidden">Search…</span>
        </span>
        <kbd className="tabular text-micro text-text-muted border border-border-subtle px-1 flex-shrink-0">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1 hidden sm:block" />

      {/* Live metrics */}
      <div className="flex items-center gap-3 h-full text-micro uppercase tracking-wider text-text-muted flex-shrink-0">
        <span className="hidden md:flex items-center gap-3">
          <LiveBadge label="STREAM" />
          <span className="tabular">
            {ingestRate} <span className="text-text-faint">ev/s</span>
          </span>
          <span className="text-border-emphasis">│</span>
        </span>
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent-critical animate-pulseDot" />
          <span className="tabular text-text-secondary">{fmtCompact(alertsPending)}</span>
          <span>ALERTS</span>
        </button>
        <span className="text-border-emphasis hidden sm:inline">│</span>

        {/* Region selector */}
        <div className="relative hidden sm:block" ref={regionRef}>
          <button
            type="button"
            onClick={() => setRegionOpen((o) => !o)}
            className="flex items-center gap-1.5 h-6 px-2 border border-border-subtle bg-bg-base hover:border-border-emphasis hover:text-text-primary transition-colors text-text-secondary text-micro uppercase tracking-wider"
            title="Select region"
          >
            {activeRegion.code === 'GLOBAL'
              ? <span className="text-sm leading-none">🌐</span>
              : <span className="text-text-muted">◉</span>}
            <span className="tabular">{activeRegion.name}</span>
            <span className="text-text-faint text-micro">{regionOpen ? '▲' : '▼'}</span>
          </button>
          {regionOpen && (
            <div className="absolute right-0 top-full mt-0.5 bg-bg-elevated border border-border-subtle shadow-panel z-shell-overlay min-w-[180px] animate-flipIn">
              {REGIONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => selectRegion(r)}
                  className={`flex items-center gap-2 w-full px-3 h-7 text-xs hover:bg-bg-hover transition-colors text-left ${
                    activeRegion.code === r.code
                      ? 'text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="w-8 mono text-text-muted text-micro flex items-center">
                    {r.code === 'GLOBAL' ? <span className="text-sm leading-none">🌐</span> : r.code}
                  </span>
                  <span>{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-center h-6 w-6 border border-border-subtle bg-bg-base hover:border-border-emphasis hover:text-text-primary transition-colors text-text-secondary"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '◑'}
        </button>

        <span className="text-border-emphasis hidden sm:inline">│</span>

        {/* User */}
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 border border-border-emphasis bg-bg-panel grid place-items-center text-text-primary text-micro font-semibold flex-shrink-0">
            {(user?.name?.[0] || 'U').toUpperCase()}
          </div>
          <span className="text-text-secondary hidden sm:inline truncate max-w-[8rem]">
            {user?.name || 'Anonymous'}
          </span>
          <button
            type="button"
            onClick={logout}
            className="text-text-muted hover:text-accent-critical ml-1"
            aria-label="Sign out"
          >
            ⏻
          </button>
        </div>
      </div>
    </header>
  );
}
