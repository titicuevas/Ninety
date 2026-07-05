import { cn } from '@/lib/utils';

export function CapsulePhoto({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={cn('rounded-lg border border-border object-cover', className)}
    />
  );
}
