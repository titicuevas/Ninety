import { useEffect, useId, useRef, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { MAX_CAPSULE_PHOTOS } from '@/lib/capsulePhotos';
import { takeCapsulePhotosWithinLimit, validateCapsulePhoto } from '@/lib/capsulePhoto';
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

export function CapsulePhotosField({
  existingUrls = [],
  newFiles,
  removedExistingUrls,
  onAddFiles,
  onRemoveNew,
  onRemoveExisting,
  className,
}: CapsulePhotosFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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

  const handlePick = (fileList: FileList | null) => {
    if (!fileList?.length) return;

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

    setError(null);
    setInfo(
      truncated > 0
        ? `Se añadieron ${accepted.length}. ${truncated} no cabían (máximo ${MAX_CAPSULE_PHOTOS}).`
        : remaining - accepted.length === 0
          ? `Has llegado al máximo de ${MAX_CAPSULE_PHOTOS} fotos.`
          : null,
    );
    onAddFiles(accepted);
    if (inputRef.current) inputRef.current.value = '';
  };

  const titleId = useId();
  const errorId = useId();

  return (
    <section className={cn('space-y-4', className)} aria-labelledby={titleId}>
      <div className="flex flex-col items-center gap-2 text-center">
        <p id={titleId} className="text-sm font-medium text-foreground">
          Tus fotos del partido
        </p>
        <p className="text-xs text-muted-foreground">
          Hasta {MAX_CAPSULE_PHOTOS} fotos · estadio, pantalla o recuerdo del partido
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/20 px-4 py-10 text-center transition-colors hover:border-primary/40 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Añadir fotos del partido"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <ImagePlus className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <div>
            <p className="font-medium text-foreground">Captura el momento</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sube fotos del estadio, la pantalla o con quién lo viste
            </p>
          </div>
        </button>
      ) : (
        <ul
          className="mx-auto grid max-w-sm list-none grid-cols-3 gap-2.5 p-0 sm:max-w-none sm:grid-cols-4"
          aria-label="Fotos seleccionadas"
        >
          {canAddMore ? (
            <li className="contents">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] hover:bg-primary/10"
                aria-label="Añadir fotos del partido"
              >
                <Camera className="h-6 w-6" aria-hidden />
                <span className="text-[11px] font-medium">Añadir</span>
              </button>
            </li>
          ) : null}

          {previews.map((item, index) =>
            item.url ? (
              <li
                key={item.id}
                className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border"
              >
                <img src={item.url} alt={`Foto ${index + 1} del partido`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    if (item.kind === 'existing') {
                      onRemoveExisting(item.url);
                      return;
                    }
                    const newIndex = newFiles.findIndex((file) => file === item.source);
                    if (newIndex >= 0) onRemoveNew(newIndex);
                  }}
                  className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={`Quitar foto ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ) : null,
          )}
        </ul>
      )}

      {!canAddMore && previews.length > 0 ? (
        <p className="text-center text-xs text-amber-200/90">
          Límite alcanzado. Quita una foto si quieres cambiar alguna.
        </p>
      ) : null}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="sr-only"
        aria-label="Añadir fotos del partido"
        onChange={(event) => handlePick(event.target.files)}
      />

      {error ? (
        <p id={errorId} role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {info && !error ? (
        <p className="text-center text-sm text-muted-foreground" role="status">
          {info}
        </p>
      ) : null}
    </section>
  );
}
