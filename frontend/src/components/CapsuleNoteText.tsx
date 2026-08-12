import { cn } from '@/lib/utils';

interface CapsuleNoteTextProps {
  note: string;
  className?: string;
  /** Vista compacta en listados (clamp). */
  compact?: boolean;
}

/** Reseña corta de una Capsule (detalle propio/público o preview en lista). */
export function CapsuleNoteText({ note, className, compact = false }: CapsuleNoteTextProps) {
  if (compact) {
    return (
      <p className={cn('mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground', className)}>
        {note}
      </p>
    );
  }

  return (
    <figure className={cn('mt-4 border-l-2 border-primary/40 pl-3', className)}>
      <figcaption className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Reseña
      </figcaption>
      <blockquote className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {note}
      </blockquote>
    </figure>
  );
}
