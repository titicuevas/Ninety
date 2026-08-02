import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DiaryAnniversary } from '@/lib/diaryAnniversary';

type Props = {
  anniversary: DiaryAnniversary | null;
  visible: boolean;
  dismiss: (permanent?: boolean) => void;
  className?: string;
};

export function DiaryAnniversaryCard({ anniversary, visible, dismiss, className }: Props) {
  if (!visible || !anniversary) return null;

  return (
    <Card
      className={cn(
        'border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent motion-reveal',
        className,
      )}
      data-testid="diary-anniversary-card"
      data-years-ago={anniversary.yearsAgo}
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <History className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold sm:text-lg">{anniversary.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{anniversary.body}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-col sm:items-stretch">
          <Button asChild className="w-full sm:w-auto">
            <Link to={anniversary.href}>{anniversary.hrefLabel}</Link>
          </Button>
          <div className="flex flex-wrap gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => dismiss(false)}>
              Ahora no
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => dismiss(true)}
            >
              No volver a mostrar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
