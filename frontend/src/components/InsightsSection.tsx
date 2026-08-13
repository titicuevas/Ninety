import { Link } from 'react-router-dom';
import { Compass, Lightbulb, Sparkles, Users } from 'lucide-react';
import type { Insight, InsightKind } from '@/lib/insights';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<InsightKind, typeof Sparkles> = {
  summary: Sparkles,
  match: Compass,
  people: Users,
  tip: Lightbulb,
};

type InsightsSectionProps = {
  insights: Insight[];
  className?: string;
};

/**
 * Insights heurísticos presentados como “IA ligera” del diario.
 */
export function InsightsSection({ insights, className }: InsightsSectionProps) {
  if (insights.length === 0) return null;

  const headingId = 'insights-heading';
  const summary = insights.find((i) => i.kind === 'summary');
  const rest = insights.filter((i) => i.kind !== 'summary');

  return (
    <section className={cn('space-y-4 motion-reveal', className)} aria-labelledby={headingId}>
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        Insights
      </h2>

      {summary ? (
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-emerald-600/20 via-emerald-950/30 to-background p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/15 blur-2xl"
            aria-hidden="true"
          />
          <p className="relative text-xs font-semibold uppercase tracking-wider text-emerald-200/90">
            {summary.title}
          </p>
          <p className="relative mt-2 text-sm leading-relaxed text-emerald-50/95 sm:text-base">
            {summary.body}
          </p>
        </div>
      ) : null}

      {rest.length > 0 ? (
        <ul className="space-y-3">
          {rest.map((insight) => {
            const Icon = KIND_ICON[insight.kind];
            return (
              <li key={insight.id} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{insight.body}</p>
                  {insight.href && insight.hrefLabel ? (
                    <Link
                      to={insight.href}
                      className="mt-1.5 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      {insight.hrefLabel}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
