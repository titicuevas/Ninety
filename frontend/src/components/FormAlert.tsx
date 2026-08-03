import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function FormAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm leading-relaxed text-destructive',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormSuccess({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm leading-relaxed text-primary',
        className,
      )}
    >
      {children}
    </div>
  );
}
