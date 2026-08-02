import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftRight, Check, Share2, Swords } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { ProfileLoadingSkeleton } from '@/components/ListSkeletons';
import { PublicLayout } from '@/components/PublicLayout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { useAuthReturnLinks } from '@/hooks/useAuthReturnLinks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfile } from '@/hooks/useProfile';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import {
  buildCompareShareText,
  buildProfileCompare,
  type CompareMetric,
  type CompareSide,
} from '@/lib/compareProfiles';
import { isAutoUsername } from '@/lib/profileHelpers';
import { shareOrCopyLink } from '@/lib/shareLink';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

function metricTone(metric: CompareMetric, side: 'me' | 'them') {
  if (metric.winner === 'na' || metric.winner === 'tie') return 'text-foreground';
  if (metric.winner === side) return 'text-emerald-300';
  return 'text-muted-foreground';
}

function CompareShareButton({
  me,
  them,
  disabled,
}: {
  me: CompareSide;
  them: CompareSide;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const result = buildProfileCompare(me, them);

  const share = async () => {
    const text = buildCompareShareText(me, them, result);
    const shareResult = await shareOrCopyLink({
      title: `Cara a cara: ${me.displayName} vs ${them.displayName}`,
      text,
      clipboardText: text,
    });

    if (shareResult === 'copied') {
      setCopied(true);
      toast.success('Cara a cara copiado');
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }
    if (shareResult === 'shared') {
      toast.success('Cara a cara compartido');
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled}
      onClick={() => void share()}
      aria-label={copied ? 'Cara a cara copiado' : 'Compartir cara a cara'}
    >
      {copied ? (
        <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
      ) : (
        <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
      )}
      {copied ? 'Copiado' : 'Compartir'}
    </Button>
  );
}

export function CompareProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { loginTo } = useAuthReturnLinks();
  const { data: meProfile, isLoading: meLoading } = useProfile();

  const themQuery = usePublicProfile(username);
  const meUsername = meProfile?.username;
  const canCompareAsMe =
    !!user && !!meUsername && !isAutoUsername(meUsername) && meUsername !== username;
  const meQuery = usePublicProfile(canCompareAsMe ? meUsername : undefined);

  const themProfile = themQuery.data?.pages[0]?.profile;
  const themStats = themQuery.data?.pages[0]?.stats;
  const meStats = meQuery.data?.pages[0]?.stats;

  const themDisplay =
    themProfile?.display_name ?? themProfile?.username ?? username ?? 'Aficionado';
  const meDisplay =
    meProfile?.display_name ?? meProfile?.username ?? 'Tú';

  useDocumentTitle(
    themProfile?.username
      ? `vs @${themProfile.username}`
      : themQuery.isLoading
        ? 'Cara a cara'
        : 'Perfil no encontrado',
  );

  const Shell = user ? Layout : PublicLayout;
  const isOwnProfile = !!user && themProfile?.id === user.id;

  if (themQuery.isLoading || (user && meLoading)) {
    return (
      <Shell>
        <ProfileLoadingSkeleton />
      </Shell>
    );
  }

  if (themQuery.isError || !themProfile) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Usuario no encontrado</h1>
          <p className="text-sm text-muted-foreground">
            {themQuery.error instanceof Error
              ? themQuery.error.message
              : 'No existe ese perfil público.'}
          </p>
          <Button asChild variant="secondary">
            <Link to={user ? '/feed' : '/'}>{user ? 'Volver al feed' : 'Volver al inicio'}</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-6 py-12 text-center">
          <Swords className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Cara a cara</h1>
            <p className="text-sm text-muted-foreground">
              Inicia sesión para comparar tu diario con el de {themDisplay}.
            </p>
          </div>
          <Button asChild>
            <Link to={loginTo}>Inicia sesión para comparar</Link>
          </Button>
          <p>
            <Link
              to={`/u/${encodeURIComponent(themProfile.username!)}`}
              className="text-sm text-primary hover:underline"
            >
              Ver perfil de @{themProfile.username}
            </Link>
          </p>
        </div>
      </Shell>
    );
  }

  if (isOwnProfile) {
    return (
      <Shell>
        <EmptyState
          title="No puedes compararte contigo"
          description="Abre el perfil de otro aficionado y pulsa Cara a cara."
        >
          <Button asChild variant="secondary">
            <Link to={`/u/${encodeURIComponent(themProfile.username!)}`}>Volver al perfil</Link>
          </Button>
        </EmptyState>
      </Shell>
    );
  }

  if (isAutoUsername(meUsername) || !meUsername) {
    return (
      <Shell>
        <EmptyState
          title="Elige un username primero"
          description="Necesitas un perfil público reclamado para el cara a cara."
        >
          <Button asChild>
            <Link to="/profile">Ir a mi perfil</Link>
          </Button>
        </EmptyState>
      </Shell>
    );
  }

  if (meQuery.isError) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg py-8">
          <QueryErrorCard
            message={
              meQuery.error instanceof Error
                ? meQuery.error.message
                : 'No se pudo cargar tu diario para comparar.'
            }
            onRetry={() => void meQuery.refetch()}
            loading={meQuery.isFetching}
          />
        </div>
      </Shell>
    );
  }

  if (meQuery.isLoading) {
    return (
      <Shell>
        <ProfileLoadingSkeleton />
      </Shell>
    );
  }

  const emptyStats = {
    totalMatches: 0,
    averageRating: null,
    topTeam: null,
    topTeams: [] as Array<{ name: string; count: number }>,
    topCompetition: null,
    peakMonth: null,
    fiveStarCount: 0,
    topWatchContext: null,
    stadiumVisits: 0,
    photosCount: 0,
    photoCollageUrls: [] as string[],
    matchesByMonth: Array.from({ length: 12 }, () => 0),
    bestRated: null,
  };

  const meSide: CompareSide = {
    username: meUsername,
    displayName: meDisplay,
    stats: meStats ?? emptyStats,
  };
  const themSide: CompareSide = {
    username: themProfile.username!,
    displayName: themDisplay,
    stats: themStats ?? emptyStats,
  };
  const compare = buildProfileCompare(meSide, themSide);

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <Link
            to={`/u/${encodeURIComponent(themProfile.username!)}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            ← Volver a @{themProfile.username}
          </Link>
        </div>

        <section
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-emerald-600/25 via-emerald-900/15 to-background p-5 sm:p-6"
          aria-labelledby="compare-heading"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
            aria-hidden
          />
          <div className="relative space-y-5">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-medium text-emerald-100">
              <Swords className="h-3.5 w-3.5" aria-hidden />
              Cara a cara
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 id="compare-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
                  {meDisplay}{' '}
                  <span className="text-emerald-200/80">vs</span> {themDisplay}
                </h1>
                <p className="mt-1 text-sm text-white/70">{compare.headline}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className="rounded-xl bg-black/30 px-3 py-2 font-mono text-lg font-semibold tabular-nums"
                  aria-label={`Marcador ${compare.scoreLabel}`}
                >
                  {compare.scoreLabel}
                </p>
                <CompareShareButton me={meSide} them={themSide} />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-1 text-center text-xs text-white/60">
              <p className="truncate font-medium text-emerald-100">Tú</p>
              <ArrowLeftRight className="mx-auto h-3.5 w-3.5" aria-hidden />
              <p className="truncate font-medium text-white/80">@{themProfile.username}</p>
            </div>

            <ul className="space-y-2" aria-label="Métricas cara a cara">
              {compare.metrics.map((metric) => (
                <li
                  key={metric.id}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-black/25 px-3 py-3 backdrop-blur-sm"
                >
                  <p className={cn('truncate text-left text-sm font-semibold', metricTone(metric, 'me'))}>
                    {metric.meDisplay}
                  </p>
                  <div className="min-w-[5.5rem] text-center">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                      {metric.label}
                    </p>
                    {metric.deltaLabel ? (
                      <p className="text-[10px] text-emerald-200/70">{metric.deltaLabel}</p>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      'truncate text-right text-sm font-semibold',
                      metricTone(metric, 'them'),
                    )}
                  >
                    {metric.themDisplay}
                  </p>
                </li>
              ))}
            </ul>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/90">
                  Tu equipo top
                </p>
                <p className="mt-1 truncate font-semibold">
                  {meSide.stats.topTeam?.name ?? '—'}
                  {meSide.stats.topTeam ? (
                    <span className="ml-1 text-sm font-normal text-white/60">
                      · {meSide.stats.topTeam.count}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  Su equipo top
                </p>
                <p className="mt-1 truncate font-semibold">
                  {themSide.stats.topTeam?.name ?? '—'}
                  {themSide.stats.topTeam ? (
                    <span className="ml-1 text-sm font-normal text-white/60">
                      · {themSide.stats.topTeam.count}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            {compare.sharedTeams.length > 0 ? (
              <p className="text-sm text-emerald-100/90">
                En común:{' '}
                <span className="font-medium text-white">{compare.sharedTeams.join(' · ')}</span>
              </p>
            ) : null}
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to={`/u/${encodeURIComponent(themProfile.username!)}`}>Ver su diario</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to={`/u/${encodeURIComponent(meUsername)}`}>Ver el mío</Link>
          </Button>
        </div>
      </div>
    </Shell>
  );
}
