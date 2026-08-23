import { useEffect, useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Star } from 'lucide-react';
import { CapsulePhotosField } from '@/components/CapsulePhotosField';
import { CapsuleTagsField } from '@/components/CapsuleTags';
import { FormAlert } from '@/components/FormAlert';
import { DirtyLeaveDialog } from '@/components/DirtyLeaveDialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { DateInput } from '@/components/ui/date-input';
import { Textarea } from '@/components/ui/textarea';
import { useDirtyLeave } from '@/hooks/useDirtyLeave';
import {
  CAPSULE_NOTE_MAX,
  capsuleNoteLength,
} from '@/lib/capsuleNote';
import {
  CAPSULE_TAGS_MAX,
  CAPSULE_TAG_MAX_LEN,
  CAPSULE_TAG_SUGGESTIONS,
  normalizeCapsuleTag,
  normalizeCapsuleTags,
} from '@/lib/capsuleTags';
import {
  clearDraftCapsuleMemory,
  readDraftCapsuleMemory,
  saveDraftCapsuleMemory,
} from '@/lib/draftCapsuleMemory';
import { cn } from '@/lib/utils';
import {
  WATCH_CONTEXTS,
  WATCH_CONTEXT_LABELS,
  type WatchContext,
} from '@/lib/watchContext';

const memorySchema = z.object({
  watched_at: z.string().date('Fecha inválida'),
  note: z
    .string()
    .max(CAPSULE_NOTE_MAX, `Máximo ${CAPSULE_NOTE_MAX} caracteres`)
    .optional(),
});

export type CapsuleMemoryFormValues = z.infer<typeof memorySchema>;

type CapsuleMemorySubmitPayload = CapsuleMemoryFormValues & {
  rating: number | null;
  is_public: boolean;
  watch_context: WatchContext | null;
  tags: string[];
  newFiles: File[];
  keptPhotoUrls: string[];
  removedPhotoUrls: string[];
};

const NO_PHOTO_URLS: string[] = [];

function chipClass(selected: boolean) {
  return cn(
    'min-h-10 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    selected
      ? 'bg-primary text-primary-foreground shadow-[0_0_20px_-10px_rgba(16,185,129,0.8)]'
      : 'bg-secondary text-muted-foreground ring-1 ring-border hover:text-foreground hover:ring-primary/30',
  );
}

interface CapsuleMemoryFormProps {
  defaultWatchedAt: string;
  defaultNote?: string;
  defaultRating?: number | null;
  defaultIsPublic?: boolean;
  defaultWatchContext?: WatchContext | null;
  defaultTags?: string[];
  existingPhotoUrls?: string[];
  /** Si se pasa, persiste nota/rating/contexto/visibilidad/tags en sessionStorage (crear Capsule). */
  draftMatchId?: number;
  submitLabel: string;
  isBusy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (payload: CapsuleMemorySubmitPayload) => void | Promise<void>;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      {title ? (
        <header className="mb-3 space-y-0.5 border-b border-border/70 pb-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}

function CapsuleVisibilitySection({
  isPublic,
  onChange,
}: {
  isPublic: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <SectionCard title="Visibilidad" description="Quién puede ver esta Capsule.">
      <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Visibilidad de la Capsule">
        <button
          type="button"
          role="radio"
          aria-checked={isPublic}
          onClick={() => onChange(true)}
          className={cn(
            'rounded-xl border px-4 py-3.5 text-left transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isPublic
              ? 'border-primary bg-primary/10 shadow-[0_0_28px_-16px_rgba(16,185,129,0.7)]'
              : 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/25 hover:text-foreground',
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Eye className="h-4 w-4 text-primary" aria-hidden />
            Pública
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            Visible en tu perfil y al compartir
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!isPublic}
          onClick={() => onChange(false)}
          className={cn(
            'rounded-xl border px-4 py-3.5 text-left transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            !isPublic
              ? 'border-primary bg-primary/10 shadow-[0_0_28px_-16px_rgba(16,185,129,0.7)]'
              : 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/25 hover:text-foreground',
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <EyeOff className="h-4 w-4 text-primary" aria-hidden />
            Solo yo
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            Queda en tu diario, sin enlace público
          </span>
        </button>
      </div>
    </SectionCard>
  );
}

export function CapsuleMemoryForm({
  defaultWatchedAt,
  defaultNote = '',
  defaultRating = null,
  defaultIsPublic = true,
  defaultWatchContext = null,
  defaultTags = [],
  existingPhotoUrls = NO_PHOTO_URLS,
  draftMatchId,
  submitLabel,
  isBusy = false,
  error,
  onCancel,
  onSubmit,
}: CapsuleMemoryFormProps) {
  const draft = draftMatchId != null ? readDraftCapsuleMemory(draftMatchId) : null;

  const [rating, setRating] = useState<number | null>(draft?.rating ?? defaultRating);
  const [isPublic, setIsPublic] = useState(draft?.is_public ?? defaultIsPublic);
  const [watchContext, setWatchContext] = useState<WatchContext | null>(
    draft?.watch_context ?? defaultWatchContext,
  );
  const [tags, setTags] = useState<string[]>(() =>
    normalizeCapsuleTags(draft?.tags ?? defaultTags),
  );
  const [tagError, setTagError] = useState<string | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedPhotoUrls, setRemovedPhotoUrls] = useState<string[]>([]);

  const initialWatchedAt = draft?.watched_at ?? defaultWatchedAt;
  const initialNote = draft?.note ?? defaultNote;
  const initialRating = draft?.rating ?? defaultRating;
  const initialIsPublic = draft?.is_public ?? defaultIsPublic;
  const initialWatchContext = draft?.watch_context ?? defaultWatchContext;
  const initialTags = normalizeCapsuleTags(draft?.tags ?? defaultTags);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CapsuleMemoryFormValues>({
    resolver: zodResolver(memorySchema),
    defaultValues: {
      watched_at: initialWatchedAt,
      note: initialNote,
    },
  });

  const watchedAt = useWatch({ control, name: 'watched_at' });
  const note = useWatch({ control, name: 'note' });

  const tagsChanged =
    tags.length !== initialTags.length || tags.some((t, i) => t !== initialTags[i]);

  const isDirty =
    (watchedAt || defaultWatchedAt) !== initialWatchedAt ||
    (note ?? '') !== initialNote ||
    rating !== initialRating ||
    isPublic !== initialIsPublic ||
    watchContext !== initialWatchContext ||
    tagsChanged ||
    newFiles.length > 0 ||
    removedPhotoUrls.length > 0;

  const { leaveOpen, requestLeave, confirmLeave, dismissLeave } = useDirtyLeave({
    isDirty,
    isBusy,
    onAbandon: () => {
      if (draftMatchId != null) clearDraftCapsuleMemory();
    },
    onLeave: onCancel,
  });

  useEffect(() => {
    if (draftMatchId == null) return;
    const timer = window.setTimeout(() => {
      saveDraftCapsuleMemory({
        matchId: draftMatchId,
        watched_at: watchedAt || defaultWatchedAt,
        note: note ?? '',
        rating,
        is_public: isPublic,
        watch_context: watchContext,
        tags,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draftMatchId, watchedAt, note, rating, isPublic, watchContext, tags, defaultWatchedAt]);

  const tryAddTag = (raw: string): { ok: true; tags: string[] } | { ok: false; error: string } => {
    const tag = normalizeCapsuleTag(raw);
    if (!tag) {
      setTagError('Etiqueta inválida (letras/números, máx. 24).');
      return { ok: false, error: 'invalid' };
    }
    if (tags.includes(tag)) {
      setTagError('Ya tienes esa etiqueta.');
      return { ok: false, error: 'duplicate' };
    }
    if (tags.length >= CAPSULE_TAGS_MAX) {
      setTagError(`Máximo ${CAPSULE_TAGS_MAX} etiquetas.`);
      return { ok: false, error: 'max' };
    }
    setTagError(null);
    return { ok: true, tags: [...tags, tag] };
  };

  const handleFormSubmit = (data: CapsuleMemoryFormValues) => {
    const removed = new Set(removedPhotoUrls);
    void onSubmit({
      ...data,
      rating,
      is_public: isPublic,
      watch_context: watchContext,
      tags,
      newFiles,
      keptPhotoUrls: existingPhotoUrls.filter((url) => !removed.has(url)),
      removedPhotoUrls,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-5">
      <SectionCard>
        <CapsulePhotosField
          existingUrls={existingPhotoUrls}
          newFiles={newFiles}
          removedExistingUrls={removedPhotoUrls}
          onAddFiles={(files) => setNewFiles((prev) => [...prev, ...files])}
          onRemoveNew={(index) => setNewFiles((prev) => prev.filter((_, i) => i !== index))}
          onRemoveExisting={(url) => setRemovedPhotoUrls((prev) => [...prev, url])}
        />
      </SectionCard>

      <SectionCard title="Recuerdo" description="Fecha, contexto y cómo lo viviste.">
        <div className="space-y-4 sm:space-y-5">
          <FormField label="¿Cuándo lo viste?" error={errors.watched_at?.message}>
            <DateInput {...register('watched_at')} />
          </FormField>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">¿Dónde lo viste? (opcional)</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Contexto de visionado">
              <button
                type="button"
                role="radio"
                aria-checked={watchContext === null}
                onClick={() => setWatchContext(null)}
                className={chipClass(watchContext === null)}
              >
                Sin decir
              </button>
              {WATCH_CONTEXTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={watchContext === value}
                  onClick={() => setWatchContext(value)}
                  className={chipClass(watchContext === value)}
                >
                  {WATCH_CONTEXT_LABELS[value]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Valoración (opcional)</legend>
            <div
              className="flex flex-wrap justify-center gap-2 sm:justify-start"
              role="radiogroup"
              aria-label="Valoración del partido"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  onClick={() => setRating(rating === value ? null : value)}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 sm:h-12 sm:w-12',
                    rating != null && value <= rating
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/35'
                      : 'bg-secondary text-muted-foreground ring-1 ring-border',
                  )}
                  aria-label={`${value} de 5 estrellas`}
                >
                  <Star
                    className={cn('h-6 w-6 sm:h-7 sm:w-7', rating != null && value <= rating && 'fill-current')}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <FormField
              label="Reseña corta (opcional)"
              hint={`Texto libre además de las estrellas · máx. ${CAPSULE_NOTE_MAX} caracteres`}
              error={errors.note?.message}
            >
              <Textarea
                id="note"
                rows={4}
                maxLength={CAPSULE_NOTE_MAX}
                className="min-h-28 w-full resize-y text-base"
                placeholder="Qué sentiste, con quién lo viste, un detalle que no quieres olvidar…"
                {...register('note')}
              />
            </FormField>
            <p className="text-right text-xs tabular-nums text-muted-foreground" aria-live="polite">
              {capsuleNoteLength(note)}/{CAPSULE_NOTE_MAX}
            </p>
          </div>

          <CapsuleTagsField
            tags={tags}
            onChange={(next) => {
              setTagError(null);
              setTags(next);
            }}
            suggestions={CAPSULE_TAG_SUGGESTIONS}
            maxTags={CAPSULE_TAGS_MAX}
            maxLen={CAPSULE_TAG_MAX_LEN}
            disabled={isBusy}
            error={tagError}
            tryAdd={tryAddTag}
          />
        </div>
      </SectionCard>

      <CapsuleVisibilitySection isPublic={isPublic} onChange={setIsPublic} />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}

      <div className="sticky bottom-16 z-10 -mx-4 space-y-2 border-t border-border/80 bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:static lg:bottom-auto lg:mx-0 lg:space-y-3 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Button type="submit" loading={isBusy} size="lg" className="h-12 w-full text-base font-semibold">
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full text-base text-muted-foreground hover:text-foreground"
          onClick={requestLeave}
        >
          Cancelar
        </Button>
      </div>

      <DirtyLeaveDialog
        open={leaveOpen}
        description={
          draftMatchId != null
            ? 'Se perderá el borrador de este partido.'
            : 'Perderás los cambios de esta Capsule.'
        }
        onConfirm={confirmLeave}
        onCancel={dismissLeave}
      />
    </form>
  );
}
