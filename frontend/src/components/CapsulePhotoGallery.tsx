import { useCallback, useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getCapsulePhotoUrls } from '@/lib/capsulePhotos';
import { CapsulePhoto } from '@/components/CapsulePhoto';
import { cn } from '@/lib/utils';

function PhotoLightbox({
  urls,
  alt,
  startIndex,
  onClose,
}: {
  urls: string[];
  alt: string;
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % urls.length);
  }, [urls.length]);

  const onGoPrev = useEffectEvent(goPrev);
  const onGoNext = useEffectEvent(goNext);
  const onCloseEvent = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    let closedByCleanup = false;

    if (!dialog.open) dialog.showModal();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') onGoPrev();
      if (event.key === 'ArrowRight') onGoNext();
    };

    const onBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };

    const onDialogClose = () => {
      if (!closedByCleanup) onCloseEvent();
    };

    dialog.addEventListener('keydown', onKey);
    dialog.addEventListener('click', onBackdropClick);
    dialog.addEventListener('close', onDialogClose);

    return () => {
      closedByCleanup = true;
      dialog.removeEventListener('keydown', onKey);
      dialog.removeEventListener('click', onBackdropClick);
      dialog.removeEventListener('close', onDialogClose);
      if (dialog.open) dialog.close();
    };
  }, []);

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[100] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/90 p-4 open:flex"
      aria-labelledby={titleId}
    >
      <p id={titleId} className="sr-only">
        {alt} — foto {index + 1} de {urls.length}
      </p>

      <button
        type="button"
        onClick={closeDialog}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>

      {urls.length > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6"
            aria-label="Foto siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      ) : null}

      <img
        src={urls[index]}
        alt={`${alt} (${index + 1} de ${urls.length})`}
        className="max-h-[85vh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {urls.length > 1 ? (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          {index + 1} / {urls.length}
        </p>
      ) : null}
    </dialog>
  );
}

export function CapsulePhotoGallery({
  capsule,
  alt,
  className,
}: {
  capsule: { photo_urls?: string[] | null; photo_url?: string | null };
  alt: string;
  className?: string;
}) {
  const urls = getCapsulePhotoUrls(capsule);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (urls.length === 0) return null;

  if (urls.length === 1) {
    return (
      <>
        <button
          type="button"
          className={cn('block w-full text-left', className)}
          onClick={() => setLightboxIndex(0)}
          aria-label={`Ver foto a tamaño completo: ${alt}`}
        >
          <CapsulePhoto url={urls[0]} alt={alt} className="aspect-[4/3] w-full" />
        </button>
        {lightboxIndex !== null ? (
          <PhotoLightbox urls={urls} alt={alt} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          '-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 scrollbar-none',
          className,
        )}
        role="region"
        aria-label={`Galería de fotos: ${urls.length} imágenes. Toca para ampliar.`}
      >
        {urls.map((url, index) => (
          <button
            key={url}
            type="button"
            className="aspect-[4/3] w-[85%] shrink-0 snap-center text-left sm:w-[70%]"
            onClick={() => setLightboxIndex(index)}
            aria-label={`Ampliar foto ${index + 1} de ${urls.length}`}
          >
            <CapsulePhoto
              url={url}
              alt={`${alt} (${index + 1} de ${urls.length})`}
              className="h-full w-full"
            />
          </button>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-muted-foreground sm:text-left">
        Desliza · toca para ampliar · {urls.length} fotos
      </p>
      {lightboxIndex !== null ? (
        <PhotoLightbox urls={urls} alt={alt} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      ) : null}
    </>
  );
}
