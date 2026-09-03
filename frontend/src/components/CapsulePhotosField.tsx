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

function NewPhotoPreview({
  file,
  index,
  displayIndex,
  preparing,
  onRemove,
}: {
  file: File;
  index: number;
  displayIndex: number;
  preparing: boolean;
  onRemove: (index: number) => void;
}) {
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <li className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-secondary shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]">
      <img src={url} alt={`Foto ${displayIndex} del partido`} className="h-full w-full object-cover" />
      <button
        type="button"
        disabled={preparing}
        onClick={() => onRemove(index)}
        className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white ring-1 ring-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 sm:h-8 sm:w-8"
        aria-label={`Quitar foto ${displayIndex}`}
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

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

  const removedExisting = new Set(removedExistingUrls);
  const visibleExisting = existingUrls.filter((url) => !removedExisting.has(url));
  const totalCount = visibleExisting.length + newFiles.length;
  const remaining = Math.max(0, MAX_CAPSULE_PHOTOS - totalCount);
  const canAddMore = remaining > 0;

  const previewCount = visibleExisting.length + newFiles.length;

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
    <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:gap-3">
      <button
        type="button"
        disabled={!canAddMore || preparing}
        onClick={openGallery}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/80 px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Images className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        Galería
      </button>
      <button
        type="button"
        disabled={!canAddMore || preparing}
        onClick={openCamera}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-8px_rgba(16,185,129,0.55)] transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Camera className="h-5 w-5 shrink-0" aria-hidden />
        Cámara
      </button>
    </div>
  );

  return (
    <section className={cn('space-y-5', className)} aria-labelledby={titleId} aria-busy={preparing}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p id={titleId} className="text-base font-semibold tracking-tight text-foreground">
            Fotos del partido
          </p>
          <p className="text-sm leading-snug text-muted-foreground">
            Hasta {MAX_CAPSULE_PHOTOS} · se optimizan al añadirlas
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-semibold tabular-nums ring-1',
            canAddMore
              ? 'bg-primary/15 text-primary ring-primary/30'
              : 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
          )}
          aria-live="polite"
        >
          {totalCount}/{MAX_CAPSULE_PHOTOS}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground/90">
        No subas desnudos, contenido sexual ni imágenes violentas. En iPhone, JPG o la cámara evita
        problemas con HEIC.
      </p>

      {previewCount === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center gap-5 rounded-2xl border border-dashed px-4 py-9 text-center',
            'border-primary/35 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_70%)]',
          )}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
            {preparing ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            ) : (
              <ImagePlus className="h-8 w-8 text-primary" aria-hidden />
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-foreground">Captura el momento</p>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
              Elige de la galería o abre la cámara. Quedan {remaining} huecos libres.
            </p>
          </div>
          {addActions}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-border/80 bg-secondary/25 p-3 sm:p-4">
          <ul
            className="grid list-none grid-cols-3 gap-2.5 p-0 sm:grid-cols-4 sm:gap-3"
            aria-label="Fotos seleccionadas"
          >
            {canAddMore ? (
              <li className="contents">
                <button
                  type="button"
                  disabled={preparing}
                  onClick={openGallery}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-primary/45 bg-primary/8 text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] hover:bg-primary/14 disabled:opacity-50"
                  aria-label="Añadir fotos desde la galería"
                >
                  {preparing ? (
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                  ) : (
                    <Images className="h-6 w-6" aria-hidden />
                  )}
                  <span className="text-[11px] font-semibold tracking-wide">Galería</span>
                </button>
              </li>
            ) : null}

            {visibleExisting.map((url, index) => (
                <li
                  key={url}
                  className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-secondary shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]"
                >
                  <img
                    src={url}
                    alt={`Foto ${index + 1} del partido`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    disabled={preparing}
                    onClick={() => onRemoveExisting(url)}
                    className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white ring-1 ring-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 sm:h-8 sm:w-8"
                    aria-label={`Quitar foto ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
            ))}
            {newFiles.map((file, index) => (
              <NewPhotoPreview
                key={`${file.name}-${file.size}-${file.lastModified}-${file.type}`}
                file={file}
                index={index}
                displayIndex={visibleExisting.length + index + 1}
                preparing={preparing}
                onRemove={onRemoveNew}
              />
            ))}
          </ul>

          {canAddMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={preparing}
                onClick={openCamera}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <Camera className="h-4 w-4" aria-hidden />
                Hacer foto con la cámara
              </button>
            </div>
          ) : null}
        </div>
      )}

      {!canAddMore && previewCount > 0 ? (
        <p className="text-center text-xs font-medium text-amber-200/90">
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
