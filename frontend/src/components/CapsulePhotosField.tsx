import { useEffect, useId, useRef, useState } from 'react';
import { Camera, ImagePlus, Images, Loader2, X } from 'lucide-react';
import { MAX_CAPSULE_PHOTOS } from '@/lib/capsulePhotos';
import {
  CAMERA_ACCEPT,
  GALLERY_ACCEPT,
  prepareCapsulePhotos,
  takeCapsulePhotosWithinLimit,
  validateCapsulePhoto,
} from '@/lib/capsulePhoto';
import { cn } from '@/lib/utils';

type PreviewItem = {
  id: string;
  url: string;
  kind: 'existing' | 'new';
  source?: File;
};

interface CapsulePhotosFieldProps {
  existingUrls?: string[];
  newFiles: File[];
  removedExistingUrls: string[];
  onAddFiles: (files: File[]) => void;
  onRemoveNew: (index: number) => void;
  onRemoveExisting: (url: string) => void;
  className?: string;
}

const NO_EXISTING_URLS: string[] = [];

export function CapsulePhotosField({
  existingUrls = NO_EXISTING_URLS,
  newFiles,
  removedExistingUrls,
  onAddFiles,
  onRemoveNew,
  onRemoveExisting,
  className,
}: CapsulePhotosFieldProps) {
  const titleId = useId();
  const errorId = useId();
  const galleryInputId = useId();
  const cameraInputId = useId();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([]);

  const removedExisting = new Set(removedExistingUrls);
  const visibleExisting = existingUrls.filter((url) => !removedExisting.has(url));
  const totalCount = visibleExisting.length + newFiles.length;
  const remaining = Math.max(0, MAX_CAPSULE_PHOTOS - totalCount);
  const canAddMore = remaining > 0;

  useEffect(() => {
    const urls = newFiles.map((file) => URL.createObjectURL(file));
    setNewPreviewUrls(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [newFiles]);

  const previews: PreviewItem[] = [
    ...visibleExisting.map((url) => ({ id: url, url, kind: 'existing' as const })),
    ...newFiles.map((file, index) => ({
      id: `new-${index}-${file.name}-${file.size}`,
      url: newPreviewUrls[index] ?? '',
      kind: 'new' as const,
      source: file,
    })),
  ];

  const handlePick = async (fileList: FileList | null) => {
    if (!fileList?.length || preparing) return;

    const incoming = Array.from(fileList);
    for (const file of incoming) {
      const fileError = validateCapsulePhoto(file);
      if (fileError) {
        setError(fileError);
        setInfo(null);
        return;
      }
    }

    const { accepted, truncated } = takeCapsulePhotosWithinLimit(incoming, totalCount);
    if (accepted.length === 0) {
      setError(`Ya tienes el máximo de ${MAX_CAPSULE_PHOTOS} fotos. Quita alguna para añadir más.`);
      setInfo(null);
      return;
    }

    setPreparing(true);
    setError(null);
    setInfo(accepted.length > 1 ? `Preparando ${accepted.length} fotos…` : 'Preparando foto…');

    try {
      const prepared = await prepareCapsulePhotos(accepted);
      setInfo(
        truncated > 0
          ? `Se añadieron ${prepared.length}. ${truncated} no cabían (máximo ${MAX_CAPSULE_PHOTOS}).`
          : remaining - prepared.length === 0
            ? `Has llegado al máximo de ${MAX_CAPSULE_PHOTOS} fotos.`
            : null,
      );
      onAddFiles(prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron preparar las fotos.');
      setInfo(null);
    } finally {
      setPreparing(false);
      if (galleryRef.current) galleryRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const openGallery = () => galleryRef.current?.click();
  const openCamera = () => cameraRef.current?.click();

  const addActions = (
    <div className="flex w-full max-w-sm flex-col gap-2 sm:max-w-none sm:flex-row">
      <button
        type="button"
        disabled={!canAddMore || preparing}
        onClick={openGallery}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Images className="h-5 w-5 shrink-0" aria-hidden />
        Galería
      </button>
      <button
        type="button"
        disabled={!canAddMore || preparing}
        onClick={openCamera}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Camera className="h-5 w-5 shrink-0" aria-hidden />
        Cámara
      </button>
    </div>
  );

  return (
    <section className={cn('space-y-4', className)} aria-labelledby={titleId} aria-busy={preparing}>
      <div className="flex flex-col items-center gap-2 text-center">
        <p id={titleId} className="text-sm font-medium text-foreground">
          Tus fotos del partido
        </p>
        <p className="text-xs text-muted-foreground">
          Hasta {MAX_CAPSULE_PHOTOS} · se optimizan al añadirlas (móvil y PC)
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          No subas desnudos, contenido sexual ni imágenes violentas.
        </p>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            canAddMore ? 'bg-primary/15 text-primary' : 'bg-amber-500/15 text-amber-200',
          )}
          aria-live="polite"
        >
          {totalCount}/{MAX_CAPSULE_PHOTOS}
          {canAddMore ? ` · ${remaining} libre${remaining === 1 ? '' : 's'}` : ' · completo'}
        </span>
      </div>

      {previews.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            {preparing ? (
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
            ) : (
              <ImagePlus className="h-7 w-7 text-primary" aria-hidden />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">Captura el momento</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Elige de la galería o abre la cámara. En iPhone, JPG o la cámara evita problemas con HEIC.
            </p>
          </div>
          {addActions}
        </div>
      ) : (
        <>
          <ul
            className="mx-auto grid max-w-sm list-none grid-cols-3 gap-2.5 p-0 sm:max-w-none sm:grid-cols-4"
            aria-label="Fotos seleccionadas"
          >
            {canAddMore ? (
              <li className="contents">
                <button
                  type="button"
                  disabled={preparing}
                  onClick={openGallery}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] hover:bg-primary/10 disabled:opacity-50"
                  aria-label="Añadir fotos desde la galería"
                >
                  {preparing ? (
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                  ) : (
                    <Images className="h-6 w-6" aria-hidden />
                  )}
                  <span className="text-[11px] font-medium">Galería</span>
                </button>
              </li>
            ) : null}

            {previews.map((item, index) =>
              item.url ? (
                <li
                  key={item.id}
                  className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border"
                >
                  <img
                    src={item.url}
                    alt={`Foto ${index + 1} del partido`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    disabled={preparing}
                    onClick={() => {
                      if (item.kind === 'existing') {
                        onRemoveExisting(item.url);
                        return;
                      }
                      const newIndex = newFiles.findIndex((file) => file === item.source);
                      if (newIndex >= 0) onRemoveNew(newIndex);
                    }}
                    className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 sm:h-8 sm:w-8"
                    aria-label={`Quitar foto ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ) : null,
            )}
          </ul>

          {canAddMore ? (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                disabled={preparing}
                onClick={openCamera}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <Camera className="h-4 w-4" aria-hidden />
                Hacer foto con la cámara
              </button>
            </div>
          ) : null}
        </>
      )}

      {!canAddMore && previews.length > 0 ? (
        <p className="text-center text-xs text-amber-200/90">
          Límite alcanzado. Quita una foto si quieres cambiar alguna.
        </p>
      ) : null}

      <input
        id={galleryInputId}
        ref={galleryRef}
        type="file"
        accept={GALLERY_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void handlePick(event.target.files)}
      />
      <input
        id={cameraInputId}
        ref={cameraRef}
        type="file"
        accept={CAMERA_ACCEPT}
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void handlePick(event.target.files)}
      />

      {error ? (
        <p id={errorId} role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {info && !error ? (
        <p className="text-center text-sm text-muted-foreground" role="status" aria-live="polite">
          {info}
        </p>
      ) : null}
    </section>
  );
}
