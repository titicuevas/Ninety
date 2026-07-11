import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { WrappedSummary } from '@/components/WrappedSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCapsules } from '@/hooks/useCapsules';
import { computeCapsuleStats } from '@/lib/capsuleStats';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuthInit';
import { isProfileIncomplete } from '@/lib/profileHelpers';

export function HomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: capsulesData, isLoading } = useCapsules();
  const profileIncomplete = isProfileIncomplete(profile);

  const metadataName =
    typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : undefined;
  const name = profile?.display_name ?? metadataName ?? 'Aficionado';
  const capsules = capsulesData?.capsules ?? [];
  const stats = computeCapsuleStats(capsules);

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

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : stats.totalMatches === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center sm:p-8">
              <p className="text-lg font-medium">Tu Wrapped empieza aquí</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Guarda tu primer partido y verás estadísticas, highlights y tu mejor valoración.
              </p>
              <Button asChild className="mt-4">
                <Link to="/search">Buscar partido</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <WrappedSummary name={name} stats={stats} />
        )}
      </div>
    </Layout>
  );
}
