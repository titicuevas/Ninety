import { useEffect, useId, useState } from 'react';
import { useTeamSearch } from '@/hooks/useTeamSearch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  placeholder?: string;
  className?: string;
};

export function FavoriteTeamField({
  value,
  onChange,
  id,
  placeholder = 'Ej: FC Barcelona',
  className,
  ...a11y
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(value.trim());
  const { data, isFetching } = useTeamSearch(debounced);
  const teams = data?.teams ?? [];

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && teams.length > 0}
        role="combobox"
        {...a11y}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && debounced.length >= 2 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          {isFetching && teams.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">Buscando equipos…</li>
          ) : null}
          {!isFetching && teams.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              Sin sugerencias — puedes dejar el nombre escrito.
            </li>
          ) : null}
          {teams.map((team) => (
            <li key={`${team.id ?? team.name}-${team.name}`} role="option">
              <button
                type="button"
                className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(team.name);
                  setOpen(false);
                }}
              >
                <span className="truncate font-medium">{team.name}</span>
                {team.shortName ? (
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">{team.shortName}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
