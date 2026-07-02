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
  children: React.ReactElement<FormFieldChildProps>;
  className?: string;
}

export function FormField({ label, error, children, className }: FormFieldProps) {
  const id = children.props.id ?? label.toLowerCase().replace(/\s/g, '-');

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, { id, 'aria-invalid': !!error })}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
