import clsx from 'clsx';

/**
 * Themed skeleton loader — a shimmering placeholder block.
 *
 * @param {{ className?: string, rows?: number, height?: string }} props
 */
export function Skeleton({ className, rows = 1, height = 'h-3' }) {
  if (rows === 1) {
    return (
      <div
        className={clsx(
          'bg-bg-hover rounded-xs relative overflow-hidden',
          height,
          className,
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-scan" />
      </div>
    );
  }
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={clsx('bg-bg-hover rounded-xs relative overflow-hidden', height, i === rows - 1 ? 'w-3/4' : 'w-full')}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-scan" />
        </div>
      ))}
    </div>
  );
}

/** Full-width table row skeleton. */
export function TableRowSkeleton({ cols = 6 }) {
  const widths = ['w-20', 'w-16', 'w-36', 'w-8', 'w-24', 'w-32'];
  return (
    <div className="flex items-center gap-3 px-2 py-1.5 border-b border-border-subtle/60">
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'h-2.5 bg-bg-hover rounded-xs relative overflow-hidden flex-shrink-0',
            widths[i % widths.length],
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-scan" />
        </div>
      ))}
    </div>
  );
}
