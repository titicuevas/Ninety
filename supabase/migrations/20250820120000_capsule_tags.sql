-- Etiquetas propias por Capsule (diario): array text, filtrable en Mis Capsules.
-- Nota: Postgres no permite subconsultas en CHECK; la forma de cada tag va en trigger.

alter table public.capsules
  add column if not exists tags text[] not null default '{}';

alter table public.capsules drop constraint if exists capsules_tags_cardinality_check;
alter table public.capsules
  add constraint capsules_tags_cardinality_check
  check (cardinality(tags) <= 8);

-- Si se intentó el CHECK inválido en un intento previo (puede no existir).
alter table public.capsules drop constraint if exists capsules_tags_elements_check;

create or replace function public.capsules_tags_validate()
returns trigger
language plpgsql
as $$
declare
  tag text;
begin
  if new.tags is null then
    new.tags := '{}';
  end if;

  foreach tag in array new.tags
  loop
    if char_length(tag) < 1 or char_length(tag) > 24 then
      raise exception 'capsule tag length must be between 1 and 24'
        using errcode = '23514';
    end if;
    if tag <> lower(tag) or tag <> btrim(tag) then
      raise exception 'capsule tags must be lowercase and trimmed'
        using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists capsules_tags_validate_trg on public.capsules;
create trigger capsules_tags_validate_trg
  before insert or update of tags on public.capsules
  for each row
  execute function public.capsules_tags_validate();

create index if not exists capsules_tags_gin on public.capsules using gin (tags);

notify pgrst, 'reload schema';
