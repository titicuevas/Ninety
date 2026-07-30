import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CapsuleMemoryForm } from '@/components/CapsuleMemoryForm';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { useCreateCapsule } from '@/hooks/useCapsules';
import { useAuth } from '@/hooks/useAuthInit';
import { uploadCapsulePhotos } from '@/lib/capsulePhoto';
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
  const { user } = useAuth();
  const session = useAuthStore((s) => s.session);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!match) {
    return <Navigate to="/search" replace />;
  }

  const leaveWithoutSaving = () => {
    clearDraftMatch();
    navigate(-1);
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
            navigate(`/c/${created.id}`, { replace: true });
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

        <MatchCard match={match} />

        <CapsuleMemoryForm
          defaultWatchedAt={defaultWatchedAt(match)}
          submitLabel={uploading ? 'Subiendo fotos…' : 'Guardar Capsule'}
          isBusy={uploading || createCapsule.isPending}
          error={
            submitError ??
            (createCapsule.error ? friendlyApiError((createCapsule.error as Error).message) : null)
          }
          onCancel={leaveWithoutSaving}
          onSubmit={handleSubmit}
        />
      </div>
    </Layout>
  );
}
