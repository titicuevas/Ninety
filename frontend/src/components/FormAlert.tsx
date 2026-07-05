import { cn } from '@/lib/utils';

export function FormAlert({ children, className }: { children: string; className?: string }) {
  return (
    <p role="alert" className={cn('text-sm leading-relaxed text-destructive', className)}>
      {children}
    </p>
  );
}
