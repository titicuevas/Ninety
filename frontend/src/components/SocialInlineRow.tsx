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
        className,
      )}
    >
      {items.map((child, index) => (
        <span key={index} className="inline">
          {index > 0 ? (
            <span className="mx-1.5 select-none text-muted-foreground/45" aria-hidden>
              ·
            </span>
          ) : null}
          {child}
        </span>
      ))}
    </div>
  );
}
