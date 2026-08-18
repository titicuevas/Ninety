import { Children, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Junta «también lo vieron / le gusta / comentó» en una sola línea con · */
export function SocialInlineRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-baseline text-xs leading-relaxed text-muted-foreground',
        '[&>:not(:first-child)]:before:mx-1.5 [&>:not(:first-child)]:before:select-none [&>:not(:first-child)]:before:text-muted-foreground/45 [&>:not(:first-child)]:before:content-["·"]',
        className,
      )}
    >
      {items}
    </div>
  );
}
