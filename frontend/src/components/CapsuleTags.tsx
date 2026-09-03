import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type CapsuleTagsListProps = {
  tags: string[] | null | undefined;
  className?: string;
  /** compact = chips más pequeños en listados */
  compact?: boolean;
};

export function CapsuleTagsList({ tags, className, compact = false }: CapsuleTagsListProps) {
  const list = (tags ?? []).filter((t) => typeof t === 'string' && t.trim());
  if (list.length === 0) return null;

  return (
    <ul
      className={cn('mt-3 flex flex-wrap gap-1.5', compact && 'mt-2', className)}
      aria-label="Etiquetas"
    >
      {list.map((tag) => (
        <li
          key={tag}
          className={cn(
            'rounded-md bg-secondary px-2 py-0.5 font-medium text-muted-foreground ring-1 ring-border',
            compact ? 'text-[10px]' : 'text-xs',
          )}
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

type CapsuleTagsFieldProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: readonly string[];
  maxTags: number;
  maxLen: number;
  disabled?: boolean;
  error?: string | null;
  tryAdd: (raw: string) => { ok: true; tags: string[] } | { ok: false; error: string };
};

const NO_TAG_SUGGESTIONS: readonly string[] = [];

export function CapsuleTagsField({
  tags,
  onChange,
  suggestions = NO_TAG_SUGGESTIONS,
  maxTags,
  maxLen,
  disabled = false,
  error,
  tryAdd,
}: CapsuleTagsFieldProps) {
  const [draft, setDraft] = useState('');
  const tagSet = new Set(tags);
  const availableSuggestions = suggestions.filter((s) => !tagSet.has(s));

  const commitDraft = () => {
    const result = tryAdd(draft);
    if (result.ok) {
      onChange(result.tags);
      setDraft('');
    }
  };

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium text-foreground">Etiquetas (opcional)</legend>
      <p className="text-xs text-muted-foreground">
        Hasta {maxTags} · máx. {maxLen} caracteres · p. ej. clásico, viaje, derbi
      </p>

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Etiquetas seleccionadas">
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary',
                  'ring-1 ring-primary/30 hover:bg-primary/25',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                aria-label={`Quitar etiqueta ${tag}`}
              >
                {tag}
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          id="capsule-tag-input"
          value={draft}
          maxLength={maxLen}
          disabled={disabled || tags.length >= maxTags}
          placeholder={tags.length >= maxTags ? 'Máximo alcanzado' : 'Añadir etiqueta…'}
          aria-label="Añadir etiqueta"
          aria-invalid={error ? true : undefined}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ',') return;
            e.preventDefault();
            commitDraft();
          }}
        />
        <button
          type="button"
          className={cn(
            'shrink-0 rounded-md bg-secondary px-3 text-sm font-medium text-foreground ring-1 ring-border',
            'hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          disabled={disabled || tags.length >= maxTags || !draft.trim()}
          onClick={commitDraft}
        >
          Añadir
        </button>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {availableSuggestions.length > 0 && tags.length < maxTags ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sugerencias de etiquetas">
          {availableSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={cn(
                'rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border',
                'hover:text-foreground hover:ring-primary/30',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              onClick={() => {
                const result = tryAdd(suggestion);
                if (result.ok) onChange(result.tags);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
