import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AchievementsSection } from '@/components/AchievementsSection';
import { AdvancedStatsSection } from '@/components/AdvancedStatsSection';
import { ClaimProfileCard } from '@/components/ClaimProfileCard';
import { DiaryAnniversaryCard } from '@/components/DiaryAnniversaryCard';
import { DiaryDigestCard } from '@/components/DiaryDigestCard';
import { DiaryMilestoneCard } from '@/components/DiaryMilestoneCard';
import { EmptyState } from '@/components/EmptyState';
import { HomeSocialHub } from '@/components/HomeSocialHub';
import { TodaySlot } from '@/components/TodaySlot';
import { IncompleteCapsuleCard } from '@/components/IncompleteCapsuleCard';
import { InsightsSection } from '@/components/InsightsSection';
import { Layout } from '@/components/Layout';
import { WrappedLoadingSkeleton } from '@/components/ListSkeletons';
import { OnboardingSteps } from '@/components/OnboardingSteps';
import { PushActivationBanner } from '@/components/PushActivationBanner';
import { StadiumMapSection } from '@/components/StadiumMapSection';
import { PostImportGuideCard } from '@/components/PostImportGuideCard';
import { ValueOnboardingCard } from '@/components/ValueOnboardingCard';
import { WantToGoNudgeCard } from '@/components/WantToGoNudgeCard';
import { WrappedSummary } from '@/components/WrappedSummary';
import { WrappedTeaser, WrappedTeaserCompact } from '@/components/WrappedTeaser';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCapsules } from '@/hooks/useCapsules';
import { useMyCollections } from '@/hooks/useCollections';
import { useDiaryAnniversary } from '@/hooks/useDiaryAnniversary';
import { useDiaryMilestone } from '@/hooks/useDiaryMilestone';
import { useDiaryPostImportGuide } from '@/hooks/useDiaryPostImportGuide';
import { useFollowList } from '@/hooks/useFollowList';
import { useIncompleteCapsuleNudge } from '@/hooks/useIncompleteCapsuleNudge';
import { useValueOnboarding } from '@/hooks/useValueOnboarding';
import { useWantToGoNudge } from '@/hooks/useWantToGoNudge';
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
import {
  dismissWrappedTeaser,
  readWrappedTeaserState,
  shouldShowWrappedTeaser,
} from '@/lib/wrappedTeaserMemory';

type HomeLocationState = {
  fromRegister?: boolean;
  emailConfirmed?: boolean;
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
  const homeState = location.state as HomeLocationState | null;
  const [welcomeOpen, setWelcomeOpen] = useState(() =>
    Boolean(homeState?.fromRegister || homeState?.emailConfirmed),
  );
  const [emailConfirmedWelcome] = useState(() => Boolean(homeState?.emailConfirmed));
  const profileIncomplete = isProfileIncomplete(profile);
  const hasCapsule = (capsulesData?.capsules?.length ?? 0) > 0;
  const hasFollow = (followingData?.total ?? 0) > 0;
  const showOnboarding = !isLoading && (!hasCapsule || !hasFollow || profileIncomplete);
  const hasCollection = (collectionsData?.collections?.length ?? 0) > 0;
  const compareTargetUsername =
    followingData?.profiles?.find((p) => p.username)?.username ?? null;
  const coreComplete = !showOnboarding && !isLoading;
  const postImportGuide = useDiaryPostImportGuide({ coreComplete });
  const valueOnboarding = useValueOnboarding({
    coreComplete: coreComplete && !postImportGuide.visible,
    hasCollection,
  });
  const diaryAnniversary = useDiaryAnniversary({
    capsules: capsulesData?.capsules ?? [],
    coreComplete,
    valueOnboardingVisible: valueOnboarding.visible || postImportGuide.visible,
  });
  const diaryMilestone = useDiaryMilestone({
    capsules: capsulesData?.capsules ?? [],
    coreComplete,
    valueOnboardingVisible: valueOnboarding.visible || postImportGuide.visible,
    anniversaryVisible: diaryAnniversary.visible,
  });
  const incompleteCapsule = useIncompleteCapsuleNudge({
    capsules: capsulesData?.capsules ?? [],
    coreComplete,
    valueOnboardingVisible: valueOnboarding.visible || postImportGuide.visible,
    anniversaryVisible: diaryAnniversary.visible,
    milestoneVisible: diaryMilestone.visible,
  });
  const wantToGoNudge = useWantToGoNudge({
    capsules: capsulesData?.capsules ?? [],
    coreComplete,
    valueOnboardingVisible: valueOnboarding.visible || postImportGuide.visible,
    anniversaryVisible: diaryAnniversary.visible,
    milestoneVisible: diaryMilestone.visible,
    incompleteCapsuleVisible: incompleteCapsule.visible,
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
  const showWrappedDetail = searchParams.get('view') === 'wrapped';
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
    nextParams.set('view', 'wrapped');
    setSearchParams(nextParams, { replace: true });
  };

  const wrappedDetailHref = (() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', 'wrapped');
    if (!nextParams.get('wrapped')) {
      nextParams.set('wrapped', wrappedScopeToParam(activeScope));
    }
    const qs = nextParams.toString();
    return qs ? `/home?${qs}` : '/home?view=wrapped';
  })();

  const collapseWrapped = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('view');
    setSearchParams(nextParams, { replace: true });
  };

  const [showWrappedTeaser, setShowWrappedTeaser] = useState(() =>
    shouldShowWrappedTeaser(user?.id ? readWrappedTeaserState(user.id) : null),
  );

  const dismissTeaser = useCallback(() => {
    if (user?.id) dismissWrappedTeaser(user.id);
    setShowWrappedTeaser(false);
  }, [user?.id]);

  const dismissWelcome = () => {
    setWelcomeOpen(false);
    navigate('.', { replace: true, state: {} });
  };

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8">
        {profileIncomplete ? (
          <ClaimProfileCard
            key={profile?.id ?? 'claim-pending'}
            profile={profile}
            welcome={welcomeOpen}
            onWelcomeDismiss={welcomeOpen ? dismissWelcome : undefined}
          />
        ) : welcomeOpen ? (
          <Card className="border-primary/40 bg-primary/5 motion-reveal" data-testid="welcome-register-banner">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {emailConfirmedWelcome
                    ? 'Email confirmado — bienvenido a Ninety'
                    : 'Bienvenido a Ninety'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Guarda un partido y sigue aficionados para llenar tu feed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" className="shrink-0">
                  <Link to="/search">Buscar partido</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link to="/profile">Editar perfil</Link>
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
            <PostImportGuideCard
              visible={postImportGuide.visible}
              importedCount={postImportGuide.importedCount}
              hasCollection={hasCollection}
              hasCompare={valueOnboarding.hasCompare}
              compareTargetUsername={compareTargetUsername}
              dismiss={postImportGuide.dismiss}
            />
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
            <IncompleteCapsuleCard
              nudge={incompleteCapsule.nudge}
              visible={incompleteCapsule.visible}
              dismiss={incompleteCapsule.dismiss}
              openEdit={incompleteCapsule.openEdit}
            />
            <WantToGoNudgeCard
              nudge={wantToGoNudge.nudge}
              visible={wantToGoNudge.visible}
              dismiss={wantToGoNudge.dismiss}
              openPrimary={wantToGoNudge.openPrimary}
            />
            <DiaryDigestCard
              capsules={capsules}
              coreComplete
              valueOnboardingVisible={valueOnboarding.visible || postImportGuide.visible}
              anniversaryVisible={diaryAnniversary.visible}
              milestoneVisible={diaryMilestone.visible}
              incompleteCapsuleVisible={incompleteCapsule.visible}
              wantToGoNudgeVisible={wantToGoNudge.visible}
            />
            <PushActivationBanner context="home" />
          </>
        )}

        {!isLoading && capsules.length > 0 && (
          <TodaySlot
            capsules={capsules}
            anniversary={diaryAnniversary.anniversary}
            anniversaryVisible={diaryAnniversary.visible}
            wantToGoNudge={wantToGoNudge.nudge}
            wantToGoVisible={wantToGoNudge.visible}
            total={capsulesData?.capsules?.length}
          />
        )}

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
        ) : showWrappedDetail ? (
          <div className="space-y-6" id="wrapped-detail">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Wrapped completo</p>
              <Button type="button" variant="ghost" size="sm" onClick={collapseWrapped}>
                Volver al inicio
              </Button>
            </div>
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
          </div>
        ) : showWrappedTeaser ? (
          <WrappedTeaser
            name={name}
            stats={stats}
            scope={activeScope}
            href={wrappedDetailHref}
            onDismiss={dismissTeaser}
          />
        ) : (
          <WrappedTeaserCompact href={wrappedDetailHref} stats={stats} />
        )}

        {!showWrappedDetail ? <HomeSocialHub username={profile?.username} /> : null}
      </div>
    </Layout>
  );
}
