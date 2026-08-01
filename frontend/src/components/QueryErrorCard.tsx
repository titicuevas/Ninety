import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  message: string;
  onRetry: () => void;
  loading?: boolean;
  className?: string;
};

/** Error de query con CTA Reintentar — mismo patrón en feed, búsqueda, etc. */
export function QueryErrorCard({ message, onRetry, loading, className }: Props) {
  return (
    <Card className={cn('border-destructive/40', className)}>
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-destructive">{message}</p>
        <Button type="button" variant="secondary" size="sm" loading={loading} onClick={onRetry}>
          Reintentar
        </Button>
      </CardContent>
    </Card>
  );
}
