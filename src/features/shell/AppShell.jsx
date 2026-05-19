import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { LeftNav } from './LeftNav';
import { BottomStatusBar } from './BottomStatusBar';
import { CommandPalette } from './CommandPalette';
import { useUIStore } from '@/stores/uiStore';
import { useLiveTick } from '@/hooks/useLiveTick';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * Top-level shell. Owns the live-tick worker.
 *
 * Responsive behavior:
 *   - On viewports narrower than 1024px the left nav auto-collapses to icons.
 *   - On the smallest viewports the BottomStatusBar's secondary text drops
 *     (keyboard hints) — handled in BottomStatusBar via CSS, not here.
 */
export function AppShell() {
  const collapsed = useUIStore((s) => s.leftNavCollapsed);
  const toggleLeftNav = useUIStore((s) => s.toggleLeftNav);
  const narrow = useMediaQuery('(max-width: 1023px)');
  useLiveTick(true);

  // Auto-collapse when crossing into narrow viewport, leave alone otherwise so
  // the user keeps manual control on wide screens.
  useEffect(() => {
    if (narrow && !collapsed) toggleLeftNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow]);

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex flex-1 min-h-0 min-w-0">
        <LeftNav collapsed={collapsed} />
        <main className="flex-1 min-w-0 min-h-0">
          <Outlet />
        </main>
      </div>
      <BottomStatusBar />
      <CommandPalette />
    </div>
  );
}
