import { Link } from 'react-router-dom';
import { BookOpen, CalendarDays, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDiaryDigest } from '@/hooks/useDiaryDigest';
import { cn } from '@/lib/utils';
import type { Capsule } from '@/types/capsule';

type Props = {
  capsules: Capsule[];
  coreComplete: boolean;
  valueOnboardingVisible: boolean;
  className?: string;
};

function kindIcon(kind: 'weekly' | 'nudge' | 'gap') {
  if (kind === 'weekly') return CalendarDays;
  if (kind === 'gap') return BookOpen;
  return Sparkles;
}

export function DiaryDigestCard({
  capsules,
  coreComplete,
  valueOnboardingVisible,
  className,
}: Props) {
  const { digest, visible, dismiss } = useDiaryDigest({
    capsules,
    coreComplete,
    valueOnboardingVisible,
  });

  if (!visible || !digest) return null;

  const Icon = kindIcon(digest.kind);

  return (
    <Card
      className={cn(
        'border-primary/25 bg-gradient-to-br from-primary/5 via-transparent to-transparent motion-reveal',
        className,
      )}
      data-testid="diary-digest-card"
      data-digest-kind={digest.kind}
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0 flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold sm:text-lg">{digest.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{digest.body}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-col sm:items-stretch">
          <Button asChild className="w-full sm:w-auto">
            <Link to={digest.href}>{digest.hrefLabel}</Link>
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
