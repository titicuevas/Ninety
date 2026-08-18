import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftRight, Check, Share2, Swords, Ticket, Users } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { ProfileLoadingSkeleton } from '@/components/ListSkeletons';
import { PublicLayout } from '@/components/PublicLayout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuthInit';
import { useAuthReturnLinks } from '@/hooks/useAuthReturnLinks';
import { useCapsulesInCommon, type CapsuleInCommonMatch } from '@/hooks/useCapsulesInCommon';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfile } from '@/hooks/useProfile';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import {
  buildCompareShareText,
  buildProfileCompare,
  metricBarPercents,
  type CompareMetric,
  type CompareSide,
} from '@/lib/compareProfiles';
import { isAutoUsername } from '@/lib/profileHelpers';
import { formatWatchedDate } from '@/lib/format';
import { shareOrCopyLink } from '@/lib/shareLink';
import { toast } from '@/lib/toast';
import { markCompareVisited } from '@/lib/valueOnboardingMemory';
import { cn } from '@/lib/utils';

function CompareAvatar({
  name,
  avatarUrl,
  size = 'lg',
}: {
  name: string;
  avatarUrl?: string | null;
  size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-16 w-16 sm:h-20 sm:w-20 text-xl sm:text-2xl' : 'h-10 w-10 text-sm';
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={cn('shrink-0 rounded-full border-2 border-white/25 object-cover shadow-lg', dim)}
      />
    );
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-primary font-bold text-primary-foreground shadow-lg',
        dim,
      )}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function metricTone(metric: CompareMetric, side: 'me' | 'them') {
  if (metric.winner === 'na' || metric.winner === 'tie') return 'text-foreground';
  if (metric.winner === side) return 'text-emerald-300';
  return 'text-muted-foreground';
}

function MetricProportionBar({ metric }: { metric: CompareMetric }) {
  if (metric.winner === 'na') {
    return (
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
        aria-hidden
        data-testid={`compare-bar-${metric.id}`}
      />
    );
  }

  const { mePct, themPct } = metricBarPercents(metric.meValue, metric.themValue);
  const meWins = metric.winner === 'me';
  const themWins = metric.winner === 'them';

  return (
    <div
      className="mt-2 flex h-2 overflow-hidden rounded-full bg-black/40"
      role="img"
      aria-label={`Proporción ${metric.label}: tú ${metric.meDisplay}, rival ${metric.themDisplay}`}
      data-testid={`compare-bar-${metric.id}`}
    >
      <span
        className={cn(
          'h-full transition-[width] duration-500 ease-out',
          meWins ? 'bg-emerald-400' : metric.winner === 'tie' ? 'bg-emerald-400/70' : 'bg-emerald-400/35',
        )}
        style={{ width: `${mePct}%` }}
      />
      <span
        className={cn(
          'h-full transition-[width] duration-500 ease-out',
          themWins ? 'bg-white/85' : metric.winner === 'tie' ? 'bg-white/55' : 'bg-white/30',
        )}
        style={{ width: `${themPct}%` }}
      />
    </div>
  );
}

function CompareShareButton({
  me,
  them,
  inCommonCount = 0,
  disabled,
}: {
  me: CompareSide;
  them: CompareSide;
  inCommonCount?: number;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const result = buildProfileCompare(me, them);

  const share = async () => {
    const text = buildCompareShareText(me, them, result, inCommonCount);
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

function CompareFaceOffSection({
  meDisplay,
  themDisplay,
  themUsername,
  meAvatarUrl,
  themAvatarUrl,
  compare,
  meSide,
  themSide,
  inCommonCount = 0,
}: {
  meDisplay: string;
  themDisplay: string;
  themUsername: string;
  meAvatarUrl: string | null;
  themAvatarUrl: string | null;
  compare: ReturnType<typeof buildProfileCompare>;
  meSide: CompareSide;
  themSide: CompareSide;
  inCommonCount?: number;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-emerald-600/25 via-emerald-900/15 to-background p-5 sm:p-6"
      aria-labelledby="compare-heading"
      data-testid="compare-face-off"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-emerald-400/10 blur-3xl"
        aria-hidden
      />
      <div className="relative space-y-6">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-medium text-emerald-100">
          <Swords className="h-3.5 w-3.5" aria-hidden />
          Cara a cara
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center justify-center gap-3 sm:w-auto sm:justify-start">
            <div className="flex flex-col items-center gap-1.5">
              <CompareAvatar name={meDisplay} avatarUrl={meAvatarUrl} />
              <p className="max-w-[6.5rem] truncate text-center text-xs font-medium text-emerald-100">
                Tú
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 px-1">
              <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/90">
                vs
              </span>
              <p
                className="font-mono text-lg font-bold tabular-nums text-white"
                aria-label={`Marcador ${compare.scoreLabel}`}
              >
                {compare.scoreLabel}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <CompareAvatar name={themDisplay} avatarUrl={themAvatarUrl} />
              <p className="max-w-[6.5rem] truncate text-center text-xs font-medium text-white/80">
                @{themUsername}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-3 text-center sm:w-auto sm:items-end sm:text-right">
            <div>
              <h1 id="compare-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
                {meDisplay}{' '}
                <span className="text-emerald-200/80">vs</span> {themDisplay}
              </h1>
              <p className="mt-1 max-w-sm text-sm text-white/70">{compare.headline}</p>
            </div>
            <CompareShareButton me={meSide} them={themSide} inCommonCount={inCommonCount} />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-1 text-center text-xs text-white/60">
          <p className="truncate font-medium text-emerald-100">Tú</p>
          <ArrowLeftRight className="mx-auto h-3.5 w-3.5" aria-hidden />
          <p className="truncate font-medium text-white/80">@{themUsername}</p>
        </div>

        <ul className="space-y-2" aria-label="Métricas cara a cara">
          {compare.metrics.map((metric) => (
            <li
              key={metric.id}
              className="rounded-xl bg-black/25 px-3 py-3 backdrop-blur-sm"
            >
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <p
                  className={cn(
                    'truncate text-left text-sm font-semibold',
                    metricTone(metric, 'me'),
                  )}
                >
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
              </div>
              <MetricProportionBar metric={metric} />
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
          <div
            className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3"
            data-testid="compare-shared-teams"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/90">
              <Users className="h-3.5 w-3.5" aria-hidden />
              En común
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {compare.sharedTeams.join(' · ')}
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-3"
            data-testid="compare-shared-teams-empty"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/55">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Equipos en común
            </p>
            <p className="mt-1 text-sm text-white/65">{compare.sharedTeamsEmpty}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function inCommonRatingLabel(value: number | null): string {
  return value == null ? '—' : `${value}★`;
}

function CompareInCommonSection({
  themDisplay,
  matches,
  total,
  isLoading,
  isError,
  onRetry,
}: {
  themDisplay: string;
  matches: CapsuleInCommonMatch[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  return (
    <section className="space-y-3" aria-labelledby="compare-in-common-heading" data-testid="compare-in-common">
      <div>
        <h2 id="compare-in-common-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Ticket className="h-5 w-5 text-primary" aria-hidden />
          Partidos en común
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? 'Cruzando diarios…'
            : total > 0
              ? `${total} partido${total === 1 ? '' : 's'} que ambos habéis guardado`
              : `Aún no coincidís con ${themDisplay} en el mismo partido.`}
        </p>
      </div>

      {isError ? (
        <QueryErrorCard message="No se pudieron cargar los partidos en común." onRetry={onRetry} />
      ) : isLoading ? (
        <ul className="space-y-2" role="status" aria-label="Cargando partidos en común">
          {Array.from({ length: 2 }, (_, i) => (
            <li key={i} className="rounded-xl border border-border p-3">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="mt-2 h-3 w-32" />
            </li>
          ))}
        </ul>
      ) : matches.length === 0 ? null : (
        <ul className="space-y-2">
          {matches.map((match) => (
            <li key={match.match_id}>
              <Link
                to={`/c/${match.them_capsule_id}`}
                className="block rounded-xl border border-border bg-card p-3 hover:border-primary/40 hover:text-primary"
              >
                <p className="truncate font-medium">
                  {match.home_team_name} vs {match.away_team_name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tú {inCommonRatingLabel(match.me_rating)} · {themDisplay}{' '}
                  {inCommonRatingLabel(match.them_rating)}
                  {match.watched_at ? ` · ${formatWatchedDate(match.watched_at)}` : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
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
  const inCommonQuery = useCapsulesInCommon(canCompareAsMe ? username : undefined);

  const themProfile = themQuery.data?.pages[0]?.profile;
  const themStats = themQuery.data?.pages[0]?.stats;
  const mePublicProfile = meQuery.data?.pages[0]?.profile;
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
  const compareReady =
    !!user &&
    !!themProfile &&
    !isOwnProfile &&
    !!meUsername &&
    !isAutoUsername(meUsername) &&
    !meQuery.isLoading &&
    !meQuery.isError;

  useEffect(() => {
    if (!compareReady || !user?.id) return;
    markCompareVisited(user.id);
  }, [compareReady, user?.id]);

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

  const meAvatarUrl = mePublicProfile?.avatar_url ?? meProfile?.avatar_url ?? null;
  const themAvatarUrl = themProfile.avatar_url ?? null;

  const meSide: CompareSide = {
    username: meUsername,
    displayName: meDisplay,
    stats: meStats ?? emptyStats,
    avatarUrl: meAvatarUrl,
  };
  const themSide: CompareSide = {
    username: themProfile.username!,
    displayName: themDisplay,
    stats: themStats ?? emptyStats,
    avatarUrl: themAvatarUrl,
  };
  const compare = buildProfileCompare(meSide, themSide);
  const myMatches = meSide.stats.totalMatches;

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

        {myMatches === 0 ? (
          <div
            className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm"
            data-testid="compare-empty-diary-hint"
          >
            <p className="font-medium">Tu diario aún está vacío</p>
            <p className="mt-1 text-muted-foreground">
              Guarda partidos para que el cara a cara tenga más sustancia.{' '}
              <Link to="/search" className="text-primary hover:underline">
                Buscar partido
              </Link>
            </p>
          </div>
        ) : null}

        <CompareFaceOffSection
          meDisplay={meDisplay}
          themDisplay={themDisplay}
          themUsername={themProfile.username!}
          meAvatarUrl={meAvatarUrl}
          themAvatarUrl={themAvatarUrl}
          compare={compare}
          meSide={meSide}
          themSide={themSide}
          inCommonCount={inCommonQuery.data?.total ?? 0}
        />

        <CompareInCommonSection
          themDisplay={themDisplay}
          matches={inCommonQuery.data?.matches ?? []}
          total={inCommonQuery.data?.total ?? 0}
          isLoading={inCommonQuery.isLoading}
          isError={inCommonQuery.isError}
          onRetry={() => void inCommonQuery.refetch()}
        />

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
