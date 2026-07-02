import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-surface-overlay border border-border text-white hover:bg-surface-raised',
  ghost: 'text-muted hover:text-white hover:bg-surface-overlay',
};

export function Button({ variant = 'primary', loading, className = '', children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
