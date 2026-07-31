import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CapsuleMemoryForm } from '@/components/CapsuleMemoryForm';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCapsules, useCreateCapsule } from '@/hooks/useCapsules';
import { useAuth } from '@/hooks/useAuthInit';
import { ApiError } from '@/lib/api';
import { uploadCapsulePhotos } from '@/lib/capsulePhoto';
import { clearDraftCapsuleMemory } from '@/lib/draftCapsuleMemory';
import { clearDraftMatch, readDraftMatch, saveDraftMatch } from '@/lib/draftMatch';
import { friendlyApiError } from '@/lib/friendlyErrors';
import { defaultWatchedAt, footballMatchToCapsuleBase } from '@/lib/matchCapsule';
import { useAuthStore } from '@/stores/authStore';
import type { FootballMatch } from '@/types/football';

type LocationState = {
  match?: FootballMatch;
};

function resolveMatch(stateMatch: FootballMatch | undefined): FootballMatch | null {
  if (stateMatch) {
    saveDraftMatch(stateMatch);
    return stateMatch;
  }
  return readDraftMatch();
}

export function CreateCapsulePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const stateMatch = (location.state as LocationState | null)?.match;
  const [match] = useState(() => resolveMatch(stateMatch));
  const createCapsule = useCreateCapsule();
  const { data: capsulesData } = useCapsules();
  const { user } = useAuth();
  const session = useAuthStore((s) => s.session);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const existingCapsuleId = useMemo(() => {
    if (!match) return null;
    return capsulesData?.capsules?.find((capsule) => capsule.match_id === match.id)?.id ?? null;
  }, [capsulesData?.capsules, match]);

  if (!match) {
    return <Navigate to="/search" replace />;
  }

  const leaveWithoutSaving = () => {
    clearDraftMatch();
    clearDraftCapsuleMemory();
    navigate(-1);
  };

  const openExisting = (capsuleId: string) => {
    clearDraftMatch();
    clearDraftCapsuleMemory();
    navigate(`/c/${capsuleId}`, { replace: true });
  };

  const handleSubmit = async (payload: {
    watched_at: string;
    rating: number | null;
    note?: string;
    is_public: boolean;
    watch_context: 'stadium' | 'tv' | 'pub' | 'other' | null;
    newFiles: File[];
  }) => {
    if (!user?.id || !session?.access_token) {
      setSubmitError('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    if (existingCapsuleId) {
      openExisting(existingCapsuleId);
      return;
    }

    setSubmitError(null);
    setUploading(true);

    try {
      const uploadedUrls =
        payload.newFiles.length > 0
          ? await uploadCapsulePhotos(payload.newFiles, session.access_token)
          : [];

      createCapsule.mutate(
        {
          ...footballMatchToCapsuleBase(match),
          watched_at: payload.watched_at,
          rating: payload.rating,
          note: payload.note?.trim() || null,
          photo_urls: uploadedUrls,
          is_public: payload.is_public,
          watch_context: payload.watch_context,
        },
        {
          onSuccess: (created) => {
            clearDraftMatch();
            clearDraftCapsuleMemory();
            navigate(`/c/${created.id}`, {
              replace: true,
              state: { shareNudge: payload.is_public },
            });
          },
          onError: (err) => {
            if (err instanceof ApiError && err.capsuleId) {
              openExisting(err.capsuleId);
              return;
            }
            setSubmitError(err instanceof Error ? friendlyApiError(err.message) : 'No se pudo guardar');
          },
          onSettled: () => setUploading(false),
        },
      );
    } catch (err) {
      setUploading(false);
      setSubmitError(err instanceof Error ? friendlyApiError(err.message) : 'No se pudieron subir las fotos');
    }
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-md space-y-5 pb-8 md:max-w-lg lg:max-w-xl">
        <section>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Capsule</h1>
          <p className="mt-1 text-sm text-muted-foreground">Guarda el partido con fotos y recuerdos</p>
        </section>

        <MatchCard match={match} savedCapsuleId={existingCapsuleId} />

        {existingCapsuleId ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-3 p-5">
              <p className="font-medium">Este partido ya está en tu diario</p>
              <p className="text-sm text-muted-foreground">
                Ábrelo para ver o editar tu Capsule en lugar de crear otra.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => openExisting(existingCapsuleId)}>
                  Ver Capsule
                </Button>
                <Button asChild type="button" variant="secondary">
                  <Link to={`/capsules/${existingCapsuleId}/edit`}>Editar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <CapsuleMemoryForm
            defaultWatchedAt={defaultWatchedAt(match)}
            draftMatchId={match.id}
            submitLabel={uploading ? 'Subiendo fotos…' : 'Guardar Capsule'}
            isBusy={uploading || createCapsule.isPending}
            error={
              submitError ??
              (createCapsule.error ? friendlyApiError((createCapsule.error as Error).message) : null)
            }
            onCancel={leaveWithoutSaving}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </Layout>
  );
}
