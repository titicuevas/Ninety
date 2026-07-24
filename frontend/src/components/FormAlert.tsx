import { cn } from '@/lib/utils';

export function FormAlert({ children, className }: { children: string; className?: string }) {
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
