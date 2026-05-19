import clsx from 'clsx';
import { useToastStore } from '@/stores/toastStore';

const TONE = {
  info: 'border-accent-primary/60 bg-accent-primary/10 text-accent-primary',
  success: 'border-accent-success/60 bg-accent-success/10 text-accent-success',
  warning: 'border-accent-warning/60 bg-accent-warning/10 text-accent-warning',
  critical: 'border-accent-critical/60 bg-accent-critical/10 text-accent-critical',
};

/**
 * Bottom-right toast stack. Mounted once at the app root.
 */
export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-8 right-3 z-shell-overlay flex flex-col gap-1 items-end pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'pointer-events-auto px-2.5 py-1.5 border bg-bg-elevated shadow-panel text-xs flex items-center gap-2 min-w-[240px] max-w-[420px] animate-flipIn',
            TONE[t.kind],
          )}
        >
          <span className="flex-1 truncate text-text-primary">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-text-muted hover:text-text-primary"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
