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
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debounced, setDebounced] = useState(() => value.trim());
  const { data, isFetching } = useTeamSearch(debounced);
  const teams = data?.teams ?? [];
  const showList = open && debounced.length >= 2;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value.trim());
      setActiveIndex(-1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [value]);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showList && teams.length > 0}
        aria-activedescendant={
          showList && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
        }
        role="combobox"
        {...a11y}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            setActiveIndex(-1);
          }, 150);
        }}
        onKeyDown={(e) => {
          if (!showList || teams.length === 0) {
            if (e.key === 'Escape') setOpen(false);
            return;
          }

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % teams.length);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => (i <= 0 ? teams.length - 1 : i - 1));
            return;
          }
          if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            pick(teams[activeIndex]!.name);
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
      />
      {showList ? (
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
          {teams.map((team, index) => (
            <li
              key={`${team.id ?? team.name}-${team.name}`}
              id={`${listId}-opt-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'flex w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm',
                index === activeIndex ? 'bg-secondary' : 'hover:bg-secondary',
              )}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => pick(team.name)}
            >
              <span className="truncate font-medium">{team.name}</span>
              {team.shortName ? (
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">{team.shortName}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
