import { NinetyLoader } from '@/components/NinetyLoader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function CapsuleCardSkeleton({ withAuthor = false }: { withAuthor?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {withAuthor ? (
          <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ) : null}
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 rounded-xl bg-secondary/55 px-2 py-3 sm:gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-7 w-12 shrink-0" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          </div>
          <Skeleton className="mx-auto mt-2.5 h-3 w-32" />
          <div className="mt-4 flex gap-2 border-t border-border pt-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Lista de cápsulas (Feed / Mis Capsules / perfil). */
export function CapsuleListSkeleton({
  count = 3,
  withAuthor = false,
  className,
}: {
  count?: number;
  withAuthor?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Preparando el diario…">
      <NinetyLoader variant="inline" />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <CapsuleCardSkeleton withAuthor={withAuthor} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatchCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex min-h-[4.5rem] items-center gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-36 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-5 w-10 shrink-0" />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 space-y-2 text-right">
            <Skeleton className="ml-auto h-4 w-32 max-w-full" />
            <Skeleton className="ml-auto h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Resultados de búsqueda de partidos. */
export function MatchListSkeleton({
  count = 4,
  className,
  label = 'Revisando el VAR…',
}: {
  count?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label={label} aria-live="polite">
      <NinetyLoader variant="inline" phrase={label} rotate={false} />
      <ul className="space-y-3" aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <MatchCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotificationRowSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="h-3.5 w-36 max-w-full" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="mt-0.5 h-11 w-11 shrink-0 rounded-md" />
    </div>
  );
}

/** Filas de notificaciones. */
export function NotificationListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Calentando…">
      <NinetyLoader variant="inline" />
      <div className="divide-y divide-border rounded-lg border" aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <NotificationRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function PeopleRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-20 shrink-0" />
    </div>
  );
}

/** Lista de aficionados (follows / discover). */
export function PeopleListSkeleton({
  count = 5,
  className,
  label = 'Alineando el once…',
}: {
  count?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label={label}>
      <NinetyLoader variant="inline" phrase={label} rotate={false} />
      <ul className="space-y-2" aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <PeopleRowSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Cabecera de perfil + lista de cápsulas. */
export function ProfileLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto max-w-xl space-y-6', className)} role="status" aria-label="Preparando el diario…">
      <NinetyLoader variant="inline" />
      <div className="flex items-start gap-4" aria-hidden>
        <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex gap-2" aria-hidden>
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <ul className="space-y-3" aria-hidden>
        {Array.from({ length: 2 }, (_, i) => (
          <li key={i}>
            <CapsuleCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Resumen Wrapped en Home. */
export function WrappedLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Puliendo el césped…">
      <NinetyLoader variant="inline" />
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="flex gap-2" aria-hidden>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
