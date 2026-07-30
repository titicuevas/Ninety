import { cn } from '@/lib/utils';
import { watchContextLabel } from '@/lib/watchContext';

export function WatchContextBadge({
  context,
  className,
}: {
  context: string | null | undefined;
  className?: string;
}) {
  const label = watchContextLabel(context);
  if (!label) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
    >
      {label}
    </span>
  );
}
