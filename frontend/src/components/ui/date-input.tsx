import * as React from 'react';
import { cn } from '@/lib/utils';

export function DateInput({
  className,
  ref,
  ...props
}: React.ComponentProps<'input'> & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <input
      type="date"
      ref={ref}
      className={cn(
        'date-input flex h-12 w-full min-w-0 max-w-full rounded-lg border border-input bg-secondary',
        'px-4 py-2 text-base text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
