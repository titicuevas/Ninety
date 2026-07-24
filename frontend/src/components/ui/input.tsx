import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({
  className,
  type,
  ref,
  ...props
}: React.ComponentProps<'input'> & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <input
      type={type}
      className={cn(
        // text-base en móvil evita zoom automático en iOS
        'flex h-12 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-base text-foreground placeholder:text-muted-foreground sm:h-11 sm:text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}
