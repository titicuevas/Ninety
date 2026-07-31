import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function CapsuleCardSkeleton({ withAuthor = false }: { withAuthor?: boolean }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        {withAuthor ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-10 shrink-0" />
        </div>
        <Skeleton className="h-3 w-20" />
        <div className="flex gap-2 border-t border-border pt-3">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
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
    <ul className={cn('space-y-3', className)} role="status" aria-label="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <CapsuleCardSkeleton withAuthor={withAuthor} />
        </li>
      ))}
    </ul>
  );
}

function NotificationRowSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/** Filas de notificaciones. */
export function NotificationListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn('divide-y divide-border rounded-lg border', className)}
      role="status"
      aria-label="Cargando notificaciones"
    >
      {Array.from({ length: count }, (_, i) => (
        <NotificationRowSkeleton key={i} />
      ))}
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
export function PeopleListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <ul className={cn('space-y-2', className)} role="status" aria-label="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <PeopleRowSkeleton />
        </li>
      ))}
    </ul>
  );
}

/** Cabecera de perfil + lista de cápsulas. */
export function ProfileLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto max-w-xl space-y-6', className)} role="status" aria-label="Cargando perfil">
      <div className="flex items-start gap-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <CapsuleListSkeleton count={2} />
    </div>
  );
}

/** Resumen Wrapped en Home. */
export function WrappedLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Cargando resumen">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
