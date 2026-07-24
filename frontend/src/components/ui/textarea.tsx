import * as React from 'react';
import { cn } from '@/lib/utils';

export function Textarea({
  className,
  ref,
  ...props
}: React.ComponentProps<'textarea'> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      className={cn(
        'flex min-h-28 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base text-foreground placeholder:text-muted-foreground sm:min-h-[5.5rem] sm:text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}
