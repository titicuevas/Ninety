import { getCapsulePhotoUrls } from '@/lib/capsulePhotos';
import { CapsulePhoto } from '@/components/CapsulePhoto';
import { cn } from '@/lib/utils';

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
  if (urls.length === 0) return null;

  if (urls.length === 1) {
    return <CapsulePhoto url={urls[0]} alt={alt} className={cn('aspect-[4/3] w-full', className)} />;
  }

  return (
    <div
      className={cn(
        '-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 scrollbar-none',
        className,
      )}
      role="region"
      aria-label={`Galería de fotos: ${urls.length} imágenes`}
    >
      {urls.map((url, index) => (
        <CapsulePhoto
          key={url}
          url={url}
          alt={`${alt} (${index + 1} de ${urls.length})`}
          className="aspect-[4/3] w-[85%] shrink-0 snap-center sm:w-[70%]"
        />
      ))}
    </div>
  );
}
