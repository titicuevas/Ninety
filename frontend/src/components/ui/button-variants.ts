import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-accent-hover',
        secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-card',
        ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        outline: 'border border-border bg-transparent hover:bg-secondary',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 min-h-11 px-4 py-2',
        sm: 'h-9 min-h-9 rounded-md px-3 text-xs',
        lg: 'h-12 min-h-12 rounded-lg px-6 text-base',
        icon: 'h-11 w-11 min-h-11 min-w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
