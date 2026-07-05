import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star } from 'lucide-react';
import { CapsulePhotosField } from '@/components/CapsulePhotosField';
import { FormAlert } from '@/components/FormAlert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const memorySchema = z.object({
  watched_at: z.string().date('Fecha inválida'),
  note: z.string().max(2000).optional(),
});

export type CapsuleMemoryFormValues = z.infer<typeof memorySchema>;

export type CapsuleMemorySubmitPayload = CapsuleMemoryFormValues & {
  rating: number | null;
  newFiles: File[];
  keptPhotoUrls: string[];
  removedPhotoUrls: string[];
};

interface CapsuleMemoryFormProps {
  defaultWatchedAt: string;
  defaultNote?: string;
  defaultRating?: number | null;
  existingPhotoUrls?: string[];
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
  existingPhotoUrls = [],
  submitLabel,
  isBusy = false,
  error,
  onCancel,
  onSubmit,
}: CapsuleMemoryFormProps) {
  const [rating, setRating] = useState<number | null>(defaultRating);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedPhotoUrls, setRemovedPhotoUrls] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CapsuleMemoryFormValues>({
    resolver: zodResolver(memorySchema),
    defaultValues: {
      watched_at: defaultWatchedAt,
      note: defaultNote,
    },
  });

  const handleFormSubmit = (data: CapsuleMemoryFormValues) => {
    void onSubmit({
      ...data,
      rating,
      newFiles,
      keptPhotoUrls: existingPhotoUrls.filter((url) => !removedPhotoUrls.includes(url)),
      removedPhotoUrls,
    });
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
        <FormField label="¿Cuándo lo viste?" error={errors.watched_at?.message} labelClassName="block text-center sm:text-left">
          <Input type="date" className="h-12 text-center text-base sm:text-left" {...register('watched_at')} />
        </FormField>

        <fieldset className="space-y-3">
          <legend className="w-full text-center text-sm font-medium">Valoración (opcional)</legend>
          <div
            className="mx-auto flex max-w-xs justify-center gap-2"
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
          <Label htmlFor="note" className="block text-center sm:text-left">
            Nota (opcional)
          </Label>
          <Textarea
            id="note"
            rows={4}
            className="min-h-28 text-base"
            placeholder="Con quién lo viste, dónde, qué recuerdas..."
            {...register('note')}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center">
          <FormAlert className="text-center">{error}</FormAlert>
        </div>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-4 space-y-3 border-t border-border bg-background/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="submit" loading={isBusy} className="h-12 w-full text-base">
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" className="h-12 w-full text-base" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
