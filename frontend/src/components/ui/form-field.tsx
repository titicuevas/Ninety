import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldChildProps {
  id?: string;
  'aria-invalid'?: boolean;
}

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactElement<FormFieldChildProps>;
  className?: string;
}

export function FormField({ label, error, hint, children, className }: FormFieldProps) {
  const id = children.props.id ?? label.toLowerCase().replace(/\s/g, '-');

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {React.cloneElement(children, { id, 'aria-invalid': !!error })}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
