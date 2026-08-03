import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AchievementsSection } from '@/components/AchievementsSection';
import { AdvancedStatsSection } from '@/components/AdvancedStatsSection';
import { ClaimProfileCard } from '@/components/ClaimProfileCard';
import { DiaryAnniversaryCard } from '@/components/DiaryAnniversaryCard';
import { DiaryDigestCard } from '@/components/DiaryDigestCard';
import { DiaryMilestoneCard } from '@/components/DiaryMilestoneCard';
import { EmptyState } from '@/components/EmptyState';
import { HomeSocialHub } from '@/components/HomeSocialHub';
import { InsightsSection } from '@/components/InsightsSection';
import { Layout } from '@/components/Layout';
import { WrappedLoadingSkeleton } from '@/components/ListSkeletons';
import { OnboardingSteps } from '@/components/OnboardingSteps';
import { PushActivationBanner } from '@/components/PushActivationBanner';
import { StadiumMapSection } from '@/components/StadiumMapSection';
import { ValueOnboardingCard } from '@/components/ValueOnboardingCard';
import { WrappedSummary } from '@/components/WrappedSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCapsules } from '@/hooks/useCapsules';
import { useMyCollections } from '@/hooks/useCollections';
import { useDiaryAnniversary } from '@/hooks/useDiaryAnniversary';
import { useDiaryMilestone } from '@/hooks/useDiaryMilestone';
import { useFollowList } from '@/hooks/useFollowList';
import { useValueOnboarding } from '@/hooks/useValueOnboarding';
import {
  achievementsInputFromStats,
  computeAchievements,
} from '@/lib/achievements';
import { computeAdvancedStats } from '@/lib/advancedStats';
import {
  computeCapsuleStats,
  defaultWrappedScope,
  filterCapsulesByScope,
  listCapsuleYears,
  parseWrappedScopeParam,
  wrappedScopeToParam,
  type WrappedScope,
} from '@/lib/capsuleStats';
import { computeInsights } from '@/lib/insights';
import { computeStadiumMap } from '@/lib/stadiumMap';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { isProfileIncomplete } from '@/lib/profileHelpers';

type HomeLocationState = {
  fromRegister?: boolean;
};

export function HomePage() {
  useDocumentTitle('Inicio');
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: capsulesData, isLoading } = useCapsules();
  const { data: followingData } = useFollowList(profile?.username ?? undefined, 'following');
  const { data: followersData } = useFollowList(profile?.username ?? undefined, 'followers');
  const { data: collectionsData } = useMyCollections();
  const [searchParams, setSearchParams] = useSearchParams();
  const [welcomeOpen, setWelcomeOpen] = useState(
    () => Boolean((location.state as HomeLocationState | null)?.fromRegister),
  );
  const profileIncomplete = isProfileIncomplete(profile);
  const hasCapsule = (capsulesData?.capsules?.length ?? 0) > 0;
  const hasFollow = (followingData?.total ?? 0) > 0;
  const showOnboarding = !isLoading && (!hasCapsule || !hasFollow || profileIncomplete);
  const hasCollection = (collectionsData?.collections?.length ?? 0) > 0;
  const compareTargetUsername =
    followingData?.profiles?.find((p) => p.username)?.username ?? null;
  const valueOnboarding = useValueOnboarding({
    coreComplete: !showOnboarding && !isLoading,
    hasCollection,
  });
  const diaryAnniversary = useDiaryAnniversary({
    capsules: capsulesData?.capsules ?? [],
    coreComplete: !showOnboarding && !isLoading,
    valueOnboardingVisible: valueOnboarding.visible,
  });
  const diaryMilestone = useDiaryMilestone({
    capsules: capsulesData?.capsules ?? [],
    coreComplete: !showOnboarding && !isLoading,
    valueOnboardingVisible: valueOnboarding.visible,
    anniversaryVisible: diaryAnniversary.visible,
  });

  const metadataName =
    typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : undefined;
  const name = profile?.display_name ?? metadataName ?? 'Aficionado';
  const capsules = capsulesData?.capsules ?? [];
  const years = listCapsuleYears(capsules);

  const scopeFromUrl = parseWrappedScopeParam(searchParams.get('wrapped'));
  const scopeValid =
    scopeFromUrl === 'all' || (typeof scopeFromUrl === 'number' && years.includes(scopeFromUrl));
  const activeScope: WrappedScope =
    scopeValid && scopeFromUrl != null ? scopeFromUrl : defaultWrappedScope(capsules);
  const scopedCapsules = filterCapsulesByScope(capsules, activeScope);
  const stats = computeCapsuleStats(scopedCapsules);
  const advancedStats = computeAdvancedStats(scopedCapsules, {
    favoriteTeam: profile?.favorite_team,
  });
  const stadiumMap = computeStadiumMap(capsules);
  const lifetimeStats = computeCapsuleStats(capsules);
  const achievements = computeAchievements(
    achievementsInputFromStats(lifetimeStats, {
      capsules,
      followingCount: followingData?.total,
      followersCount: followersData?.total,
    }),
  );
  const insights = computeInsights({
    name,
    scope: activeScope,
    stats,
    advanced: advancedStats,
    stadiumMap,
    capsules: scopedCapsules,
    favoriteTeam: profile?.favorite_team,
    followingCount: followingData?.total,
  });

  const onScopeChange = (next: WrappedScope) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('wrapped', wrappedScopeToParam(next));
    setSearchParams(nextParams, { replace: true });
  };

  const dismissWelcome = () => {
    setWelcomeOpen(false);
    navigate('.', { replace: true, state: {} });
  };

  return (
    <Layout>
      <div className="space-y-8">
        {profileIncomplete ? (
          <ClaimProfileCard
            profile={profile}
            welcome={welcomeOpen}
            onWelcomeDismiss={welcomeOpen ? dismissWelcome : undefined}
          />
        ) : welcomeOpen ? (
          <Card className="border-primary/40 bg-primary/5 motion-reveal" data-testid="welcome-register-banner">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Bienvenido a Ninety</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Guarda un partido y sigue aficionados para llenar tu feed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" className="shrink-0">
                  <Link to="/search">Buscar partido</Link>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={dismissWelcome}>
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {showOnboarding ? (
          <OnboardingSteps
            hasProfile={!profileIncomplete}
            hasCapsule={hasCapsule}
            hasFollow={hasFollow}
            profileClaimInline={profileIncomplete}
          />
        ) : (
          <>
            <ValueOnboardingCard
              hasCollection={hasCollection}
              compareTargetUsername={compareTargetUsername}
              visible={valueOnboarding.visible}
              hasCompare={valueOnboarding.hasCompare}
              dismiss={valueOnboarding.dismiss}
            />
            <DiaryAnniversaryCard
              anniversary={diaryAnniversary.anniversary}
              visible={diaryAnniversary.visible}
              dismiss={diaryAnniversary.dismiss}
            />
            <DiaryMilestoneCard
              milestone={diaryMilestone.milestone}
              visible={diaryMilestone.visible}
              dismiss={diaryMilestone.dismiss}
              celebrate={diaryMilestone.celebrate}
            />
            <DiaryDigestCard
              capsules={capsules}
              coreComplete
              valueOnboardingVisible={valueOnboarding.visible}
              anniversaryVisible={diaryAnniversary.visible}
              milestoneVisible={diaryMilestone.visible}
            />
            <PushActivationBanner context="home" />
          </>
        )}

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
          <>
            <AchievementsSection achievements={achievements} />
            <InsightsSection insights={insights} />
            <WrappedSummary
              name={name}
              stats={stats}
              scope={activeScope}
              years={years}
              onScopeChange={onScopeChange}
              username={profile?.username}
            />
            <AdvancedStatsSection stats={advancedStats} />
            <StadiumMapSection map={stadiumMap} />
          </>
        )}
      </div>
    </Layout>
  );
}
