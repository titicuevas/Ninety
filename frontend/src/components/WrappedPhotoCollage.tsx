import { cn } from '@/lib/utils';

type Props = {
  urls: string[];
  className?: string;
  /** Etiqueta accesible del mosaico */
  label?: string;
};

/**
 * Mosaico adaptativo 1–6 fotos para el Wrapped (CSS-only).
 */
export function WrappedPhotoCollage({
  urls,
  className,
  label = 'Fotos del Wrapped',
}: Props) {
  if (urls.length === 0) return null;

  const shown = urls.slice(0, 6);
  const count = shown.length;

  return (
    <div
      className={cn(
        'grid gap-1.5 overflow-hidden rounded-2xl border border-white/15 bg-black/20',
        count === 1 && 'grid-cols-1',
        count === 2 && 'grid-cols-2',
        count >= 3 && 'grid-cols-2 sm:grid-cols-3',
        className,
      )}
      role="img"
      aria-label={label}
    >
      {shown.map((url, index) => (
        <div
          key={url}
          className={cn(
            'relative overflow-hidden bg-black/40',
            count === 1 && 'aspect-[16/10]',
            count === 2 && 'aspect-square',
            count === 3 && index === 0 && 'col-span-2 aspect-[16/9] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-40',
            count === 3 && index > 0 && 'aspect-square',
            count === 4 && 'aspect-square',
            count >= 5 && 'aspect-square',
            count === 5 && index === 0 && 'col-span-2 sm:col-span-1',
          )}
        >
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover"
            loading={index < 2 ? 'eager' : 'lazy'}
            decoding="async"
          />
        </div>
      ))}
    </div>
  );
}
