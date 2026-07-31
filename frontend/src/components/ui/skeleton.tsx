import { cn } from '@/lib/utils';

/** Bloque de placeholder con pulse (respetado por prefers-reduced-motion global). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden />;
}
