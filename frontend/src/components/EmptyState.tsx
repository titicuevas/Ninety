import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

/** Estado vacío compartido: icono, copy y CTAs (Feed, diario, notificaciones…). */
export function EmptyState({ icon: Icon, title, description, children, className }: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed motion-reveal', className)}>
      <CardContent className="p-6 text-center sm:p-10" role="status">
        {Icon ? (
          <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
        ) : null}
        <p className="text-lg font-medium">{title}</p>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        {children ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
