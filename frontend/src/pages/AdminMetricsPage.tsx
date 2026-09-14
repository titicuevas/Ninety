import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Gauge, RefreshCw, Search, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { NinetyLoader } from '@/components/NinetyLoader';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

type AdminMetrics = {
  generated_at: string;
  users: {
    total: number;
    registered_last_7d: number;
    registered_last_30d: number;
    with_at_least_one_capsule: number;
    active_writers_last_7d: number;
    activation_rate_30d: number | null;
  };
  capsules: {
    total: number;
    created_last_7d: number;
  };
  recent_signups: Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    created_at: string;
    has_capsule: boolean;
  }>;
  system: {
    api_ready: boolean;
    uptime_seconds: number;
    football_api_configured: boolean;
  };
};

type FootballSmoke = {
  ok: boolean;
  query?: string;
  matches?: number;
  latency_ms?: number;
  error?: string;
  sample?: Array<{ id: number; utcDate: string; home: string; away: string; competition: string | null }>;
};

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function formatPct(rate: number | null): string {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminMetricsPage() {
  useDocumentTitle('Admin · métricas');
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const token = session?.access_token;

  const metricsQuery = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => apiFetch<AdminMetrics>('/api/admin/metrics', {}, token),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  const smokeMutation = useMutation({
    mutationFn: () =>
      apiFetch<FootballSmoke>('/api/admin/football-search-smoke?q=betis', {}, token),
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`Búsqueda OK · ${data.matches ?? 0} partidos (${data.latency_ms ?? 0} ms)`);
      } else {
        toast.error(data.error ?? 'Falló el smoke de búsqueda');
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo probar la búsqueda');
    },
  });

  const metrics = metricsQuery.data;
  const smoke = smokeMutation.data;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Shield className="h-6 w-6 text-primary" aria-hidden />
              Control interno
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Uso real, salud de la API y búsqueda de partidos
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={metricsQuery.isFetching}
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] })}
            >
              <RefreshCw className={cn('h-4 w-4', metricsQuery.isFetching && 'animate-spin')} aria-hidden />
              Actualizar
            </Button>
            <Link to="/settings" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Ajustes
            </Link>
          </div>
        </div>

        {metricsQuery.isLoading ? <NinetyLoader /> : null}
        {metricsQuery.isError ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {metricsQuery.error instanceof Error
              ? metricsQuery.error.message
              : 'No se pudieron cargar las métricas'}
          </p>
        ) : null}

        {metrics ? (
          <>
            <section aria-labelledby="admin-users-heading" className="space-y-3">
              <h2 id="admin-users-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                <Users className="h-4 w-4" aria-hidden />
                Usuarios
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard label="Total" value={String(metrics.users.total)} />
                <MetricCard
                  label="Altas 7 días"
                  value={String(metrics.users.registered_last_7d)}
                />
                <MetricCard
                  label="Altas 30 días"
                  value={String(metrics.users.registered_last_30d)}
                />
                <MetricCard
                  label="Con ≥1 Capsule"
                  value={String(metrics.users.with_at_least_one_capsule)}
                />
                <MetricCard
                  label="Activos 7 días"
                  value={String(metrics.users.active_writers_last_7d)}
                  hint="Escribieron al menos una Capsule"
                />
                <MetricCard
                  label="Activación 30 días"
                  value={formatPct(metrics.users.activation_rate_30d)}
                  hint="Registros recientes que ya tienen Capsule"
                />
              </div>
            </section>

            <section aria-labelledby="admin-capsules-heading" className="space-y-3">
              <h2 id="admin-capsules-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                <Activity className="h-4 w-4" aria-hidden />
                Capsules
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Total" value={String(metrics.capsules.total)} />
                <MetricCard
                  label="Creadas 7 días"
                  value={String(metrics.capsules.created_last_7d)}
                />
              </div>
            </section>

            <section aria-labelledby="admin-system-heading" className="space-y-3">
              <h2 id="admin-system-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                <Gauge className="h-4 w-4" aria-hidden />
                Sistema
              </h2>
              <ul className="space-y-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                <li>
                  API ready:{' '}
                  <span className={metrics.system.api_ready ? 'text-primary' : 'text-destructive'}>
                    {metrics.system.api_ready ? 'sí' : 'no'}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    · uptime {Math.round(metrics.system.uptime_seconds / 60)} min
                  </span>
                </li>
                <li>
                  Football API:{' '}
                  <span
                    className={
                      metrics.system.football_api_configured ? 'text-primary' : 'text-destructive'
                    }
                  >
                    {metrics.system.football_api_configured ? 'configurada' : 'falta clave'}
                  </span>
                </li>
                <li className="text-muted-foreground">
                  Generado {formatWhen(metrics.generated_at)}
                </li>
              </ul>
              <Button
                type="button"
                size="sm"
                disabled={smokeMutation.isPending || !metrics.system.football_api_configured}
                onClick={() => smokeMutation.mutate()}
              >
                <Search className="h-4 w-4" aria-hidden />
                Probar búsqueda «betis»
              </Button>
              {smoke?.ok ? (
                <p className="text-sm text-muted-foreground">
                  Último smoke: {smoke.matches} partidos · {smoke.latency_ms} ms
                  {smoke.sample?.[0]
                    ? ` · ej. ${smoke.sample[0].home} vs ${smoke.sample[0].away}`
                    : ''}
                </p>
              ) : null}
              {smoke && !smoke.ok ? (
                <p className="text-sm text-destructive">{smoke.error ?? 'Falló el smoke'}</p>
              ) : null}
            </section>

            <section aria-labelledby="admin-signups-heading" className="space-y-3">
              <h2 id="admin-signups-heading" className="text-sm font-semibold uppercase tracking-wider text-primary">
                Últimos registros
              </h2>
              {metrics.recent_signups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay perfiles.</p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                  {metrics.recent_signups.map((u) => (
                    <li
                      key={u.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {u.display_name || u.username || 'Sin nombre'}
                          {u.username ? (
                            <span className="text-muted-foreground"> · @{u.username}</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatWhen(u.created_at)}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-xs font-medium',
                          u.has_capsule ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        {u.has_capsule ? 'Con Capsule' : 'Sin Capsule'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
