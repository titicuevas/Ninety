import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CapsuleMemoryForm } from '@/components/CapsuleMemoryForm';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCapsules, useCreateCapsule } from '@/hooks/useCapsules';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ApiError } from '@/lib/api';
import { uploadCapsulePhotos } from '@/lib/capsulePhoto';
import { normalizeCapsuleNote } from '@/lib/capsuleNote';
import { clearDraftCapsuleMemory } from '@/lib/draftCapsuleMemory';
import { clearDraftMatch, readDraftMatch, saveDraftMatch } from '@/lib/draftMatch';
import { friendlyApiError } from '@/lib/friendlyErrors';
import { isManualMatchId } from '@/lib/manualMatch';
import { defaultWatchedAt, footballMatchToCapsuleBase } from '@/lib/matchCapsule';
import { markPushPromptEligible } from '@/lib/pushPromptMemory';
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
  useDocumentTitle('Nueva Capsule');
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
          note: normalizeCapsuleNote(payload.note),
          photo_urls: uploadedUrls,
          is_public: payload.is_public,
          watch_context: payload.watch_context,
        },
        {
          onSuccess: (created) => {
            clearDraftMatch();
            clearDraftCapsuleMemory();
            if (payload.is_public && user.id) {
              markPushPromptEligible(user.id, 'first_public_capsule');
            }
            navigate(`/c/${created.id}`, {
              replace: true,
              state: {
                shareNudge: payload.is_public,
                privateSaved: !payload.is_public,
              },
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
      <div className="mx-auto w-full max-w-md space-y-6 pb-10 md:max-w-lg lg:max-w-xl">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Ninety</p>
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            Nueva Capsule
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {isManualMatchId(match.id)
              ? 'Partido añadido a mano — guarda fotos y recuerdos en tu diario.'
              : 'Guarda el partido con fotos y recuerdos en tu diario.'}
          </p>
        </header>

        <MatchCard match={match} savedCapsuleId={existingCapsuleId} />

        {existingCapsuleId ? (
          <Card className="border-primary/35 bg-primary/5 shadow-[0_0_40px_-24px_rgba(16,185,129,0.55)]">
            <CardContent className="space-y-3.5 p-5">
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">Este partido ya está en tu diario</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Ábrelo para ver o editar tu Capsule en lugar de crear otra.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button type="button" className="h-11 w-full sm:w-auto" onClick={() => openExisting(existingCapsuleId)}>
                  Ver Capsule
                </Button>
                <Button asChild type="button" variant="secondary" className="h-11 w-full sm:w-auto">
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
