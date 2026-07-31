import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { HomeSocialHub } from '@/components/HomeSocialHub';
import { Layout } from '@/components/Layout';
import { WrappedLoadingSkeleton } from '@/components/ListSkeletons';
import { OnboardingSteps } from '@/components/OnboardingSteps';
import { WrappedSummary } from '@/components/WrappedSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCapsules } from '@/hooks/useCapsules';
import { useFollowList } from '@/hooks/useFollowList';
import {
  computeCapsuleStats,
  defaultWrappedScope,
  filterCapsulesByScope,
  listCapsuleYears,
  parseWrappedScopeParam,
  wrappedScopeToParam,
  type WrappedScope,
} from '@/lib/capsuleStats';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuthInit';
import { isProfileIncomplete } from '@/lib/profileHelpers';

export function HomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: capsulesData, isLoading } = useCapsules();
  const { data: followingData } = useFollowList(profile?.username ?? undefined, 'following');
  const [searchParams, setSearchParams] = useSearchParams();
  const profileIncomplete = isProfileIncomplete(profile);
  const hasCapsule = (capsulesData?.capsules?.length ?? 0) > 0;
  const hasFollow = (followingData?.total ?? 0) > 0;
  const showOnboarding = !isLoading && (!hasCapsule || !hasFollow || profileIncomplete);

  const metadataName =
    typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : undefined;
  const name = profile?.display_name ?? metadataName ?? 'Aficionado';
  const capsules = capsulesData?.capsules ?? [];
  const years = listCapsuleYears(capsules);

  const scopeFromUrl = parseWrappedScopeParam(searchParams.get('wrapped'));
  const scopeValid =
    scopeFromUrl === 'all' || (typeof scopeFromUrl === 'number' && years.includes(scopeFromUrl));
  const activeScope: WrappedScope = scopeValid && scopeFromUrl != null
    ? scopeFromUrl
    : defaultWrappedScope(capsules);
  const stats = computeCapsuleStats(filterCapsulesByScope(capsules, activeScope));

  const onScopeChange = (next: WrappedScope) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('wrapped', wrappedScopeToParam(next));
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <Layout>
      <div className="space-y-8">
        {profileIncomplete ? (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Completa tu perfil</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pon tu nombre y un username para que otros te reconozcan en el feed.
                </p>
              </div>
              <Button asChild variant="secondary" className="shrink-0">
                <Link to="/profile">Ir al perfil</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {showOnboarding ? (
          <OnboardingSteps
            hasProfile={!profileIncomplete}
            hasCapsule={hasCapsule}
            hasFollow={hasFollow}
          />
        ) : null}

        <HomeSocialHub username={profile?.username} />

        {isLoading ? (
          <WrappedLoadingSkeleton />
        ) : capsules.length === 0 ? (
          <EmptyState
            title="Tu Wrapped empieza aquí"
            description="Guarda tu primer partido y verás estadísticas, highlights y tu resumen anual."
          >
            <Button asChild>
              <Link to="/search">Buscar partido</Link>
            </Button>
          </EmptyState>
        ) : (
          <WrappedSummary
            name={name}
            stats={stats}
            scope={activeScope}
            years={years}
            onScopeChange={onScopeChange}
            username={profile?.username}
          />
        )}
      </div>
    </Layout>
  );
}
