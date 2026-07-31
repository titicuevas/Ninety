import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star } from 'lucide-react';
import { CapsulePhotosField } from '@/components/CapsulePhotosField';
import { FormAlert } from '@/components/FormAlert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  note: z.string().max(2000).optional(),
});

export type CapsuleMemoryFormValues = z.infer<typeof memorySchema>;

export type CapsuleMemorySubmitPayload = CapsuleMemoryFormValues & {
  rating: number | null;
  is_public: boolean;
  watch_context: WatchContext | null;
  newFiles: File[];
  keptPhotoUrls: string[];
  removedPhotoUrls: string[];
};

const NO_PHOTO_URLS: string[] = [];

interface CapsuleMemoryFormProps {
  defaultWatchedAt: string;
  defaultNote?: string;
  defaultRating?: number | null;
  defaultIsPublic?: boolean;
  defaultWatchContext?: WatchContext | null;
  existingPhotoUrls?: string[];
  /** Si se pasa, persiste nota/rating/contexto/visibilidad en sessionStorage (crear Capsule). */
  draftMatchId?: number;
  submitLabel: string;
  isBusy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (payload: CapsuleMemorySubmitPayload) => void | Promise<void>;
}

export function CapsuleMemoryForm({
  defaultWatchedAt,
  defaultNote = '',
  defaultRating = null,
  defaultIsPublic = true,
  defaultWatchContext = null,
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
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedPhotoUrls, setRemovedPhotoUrls] = useState<string[]>([]);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const initialWatchedAt = draft?.watched_at ?? defaultWatchedAt;
  const initialNote = draft?.note ?? defaultNote;
  const initialRating = draft?.rating ?? defaultRating;
  const initialIsPublic = draft?.is_public ?? defaultIsPublic;
  const initialWatchContext = draft?.watch_context ?? defaultWatchContext;

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

  const isDirty =
    (watchedAt || defaultWatchedAt) !== initialWatchedAt ||
    (note ?? '') !== initialNote ||
    rating !== initialRating ||
    isPublic !== initialIsPublic ||
    watchContext !== initialWatchContext ||
    newFiles.length > 0 ||
    removedPhotoUrls.length > 0;

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
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draftMatchId, watchedAt, note, rating, isPublic, watchContext, defaultWatchedAt]);

  const handleFormSubmit = (data: CapsuleMemoryFormValues) => {
    const removed = new Set(removedPhotoUrls);
    void onSubmit({
      ...data,
      rating,
      is_public: isPublic,
      watch_context: watchContext,
      newFiles,
      keptPhotoUrls: existingPhotoUrls.filter((url) => !removed.has(url)),
      removedPhotoUrls,
    });
  };

  const handleCancel = () => {
    if (isDirty) {
      setLeaveOpen(true);
      return;
    }
    if (draftMatchId != null) clearDraftCapsuleMemory();
    onCancel();
  };

  const confirmLeave = () => {
    if (draftMatchId != null) clearDraftCapsuleMemory();
    setLeaveOpen(false);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <CapsulePhotosField
          existingUrls={existingPhotoUrls}
          newFiles={newFiles}
          removedExistingUrls={removedPhotoUrls}
          onAddFiles={(files) => setNewFiles((prev) => [...prev, ...files])}
          onRemoveNew={(index) => setNewFiles((prev) => prev.filter((_, i) => i !== index))}
          onRemoveExisting={(url) => setRemovedPhotoUrls((prev) => [...prev, url])}
        />
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <FormField label="¿Cuándo lo viste?" error={errors.watched_at?.message}>
          <DateInput {...register('watched_at')} />
        </FormField>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">¿Dónde lo viste? (opcional)</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Contexto de visionado">
            <button
              type="button"
              role="radio"
              aria-checked={watchContext === null}
              onClick={() => setWatchContext(null)}
              className={cn(
                'min-h-10 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                watchContext === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
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
                className={cn(
                  'min-h-10 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  watchContext === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                {WATCH_CONTEXT_LABELS[value]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Valoración (opcional)</legend>
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
                  'flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 sm:h-12 sm:w-12',
                  rating != null && value <= rating
                    ? 'bg-primary/15 text-primary'
                    : 'bg-secondary text-muted-foreground',
                )}
                aria-label={`${value} de 5 estrellas`}
              >
                <Star className={cn('h-6 w-6 sm:h-7 sm:w-7', rating != null && value <= rating && 'fill-current')} aria-hidden />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="note">Nota (opcional)</Label>
          <Textarea
            id="note"
            rows={4}
            className="min-h-28 w-full resize-y text-base"
            placeholder="Con quién lo viste, qué recuerdas..."
            {...register('note')}
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Visibilidad</legend>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Visibilidad de la Capsule">
            <button
              type="button"
              role="radio"
              aria-checked={isPublic}
              onClick={() => setIsPublic(true)}
              className={cn(
                'rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isPublic
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="block text-sm font-medium text-foreground">Pública</span>
              <span className="mt-0.5 block text-xs">Visible en tu perfil y al compartir</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!isPublic}
              onClick={() => setIsPublic(false)}
              className={cn(
                'rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !isPublic
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="block text-sm font-medium text-foreground">Solo yo</span>
              <span className="mt-0.5 block text-xs">Queda en tu diario, sin enlace público</span>
            </button>
          </div>
        </fieldset>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}

      <div className="sticky bottom-16 z-10 -mx-4 space-y-3 border-t border-border bg-background/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:static lg:bottom-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Button type="submit" loading={isBusy} className="h-12 w-full text-base">
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" className="h-12 w-full text-base" onClick={handleCancel}>
          Cancelar
        </Button>
      </div>

      <ConfirmDialog
        open={leaveOpen}
        title="¿Salir sin guardar?"
        description={
          draftMatchId != null
            ? 'Se perderá el borrador de este partido.'
            : 'Perderás los cambios de esta Capsule.'
        }
        confirmLabel="Salir"
        cancelLabel="Seguir editando"
        tone="default"
        onConfirm={confirmLeave}
        onCancel={() => setLeaveOpen(false)}
      />
    </form>
  );
}
