import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldChildProps {
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  labelClassName?: string;
  children: React.ReactElement<FormFieldChildProps>;
  className?: string;
}

export function FormField({ label, error, hint, labelClassName, children, className }: FormFieldProps) {
  const id = children.props.id ?? label.toLowerCase().replace(/\s/g, '-');
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className={labelClassName}>
        {label}
      </Label>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {React.cloneElement(children, {
        id,
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
