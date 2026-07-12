import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { CapsuleMemoryForm } from '@/components/CapsuleMemoryForm';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCapsule, useDeleteCapsule, useUpdateCapsule } from '@/hooks/useCapsules';
import { deleteCapsulePhotosByUrls, uploadCapsulePhotos } from '@/lib/capsulePhoto';
import { friendlyApiError } from '@/lib/friendlyErrors';
import { getCapsulePhotoUrls } from '@/lib/capsulePhotos';
import { capsuleToFootballMatch } from '@/lib/matchCapsule';
import { useAuthStore } from '@/stores/authStore';

export function EditCapsulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { data: capsule, isLoading, isError } = useCapsule(id);
  const updateCapsule = useUpdateCapsule(id ?? '');
  const deleteCapsule = useDeleteCapsule();
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!id) return <Navigate to="/capsules" replace />;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (isError || !capsule) {
    return (
      <Layout>
        <Card className="mx-auto max-w-lg border-destructive/40">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">No encontramos esta Capsule.</p>
            <Button asChild className="mt-4" variant="secondary">
              <Link to="/capsules">Volver</Link>
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const handleSubmit = async (payload: {
    watched_at: string;
    rating: number | null;
    note?: string;
    newFiles: File[];
    keptPhotoUrls: string[];
    removedPhotoUrls: string[];
  }) => {
    if (!session?.access_token) {
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

      if (payload.removedPhotoUrls.length > 0) {
        await deleteCapsulePhotosByUrls(payload.removedPhotoUrls, session.access_token);
      }

      updateCapsule.mutate(
        {
          watched_at: payload.watched_at,
          rating: payload.rating,
          note: payload.note?.trim() || null,
          photo_urls: [...payload.keptPhotoUrls, ...uploadedUrls],
        },
        {
          onSuccess: () => navigate('/capsules', { replace: true }),
          onSettled: () => setUploading(false),
        },
      );
    } catch (err) {
      setUploading(false);
      setSubmitError(err instanceof Error ? friendlyApiError(err.message) : 'No se pudieron actualizar las fotos');
    }
  };

  const handleDelete = () => {
    if (!window.confirm('¿Eliminar esta Capsule? No se puede deshacer.')) return;
    deleteCapsule.mutate(capsule.id, {
      onSuccess: () => navigate('/capsules', { replace: true }),
    });
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-md space-y-5 pb-8 md:max-w-lg lg:max-w-xl">
        <section>
          <h1 className="text-2xl font-bold tracking-tight">Editar Capsule</h1>
          <p className="mt-1 text-sm text-muted-foreground">Actualiza fotos y recuerdos</p>
        </section>

        <MatchCard match={capsuleToFootballMatch(capsule)} />

        <CapsuleMemoryForm
          defaultWatchedAt={capsule.watched_at}
          defaultNote={capsule.note ?? ''}
          defaultRating={capsule.rating}
          existingPhotoUrls={getCapsulePhotoUrls(capsule)}
          submitLabel="Guardar cambios"
          isBusy={uploading || updateCapsule.isPending}
          error={
            submitError ??
            (updateCapsule.error ? friendlyApiError((updateCapsule.error as Error).message) : null)
          }
          onCancel={() => navigate(-1)}
          onSubmit={handleSubmit}
        />

        <Card className="border-destructive/30">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Zona de peligro</p>
              <p className="text-sm text-muted-foreground">Elimina esta Capsule de tu diario.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              loading={deleteCapsule.isPending}
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
