-- Etiquetas propias por Capsule (diario): array text, filtrable en Mis Capsules.
-- Forma de cada tag: validada en API (Postgres no permite subconsultas en CHECK).

alter table public.capsules
  add column if not exists tags text array not null default '{}'::text array;

alter table public.capsules drop constraint if exists capsules_tags_cardinality_check;
alter table public.capsules
  add constraint capsules_tags_cardinality_check
  check (cardinality(tags) <= 8);

alter table public.capsules drop constraint if exists capsules_tags_elements_check;

drop trigger if exists capsules_tags_validate_trg on public.capsules;
drop function if exists public.capsules_tags_validate();

create index if not exists capsules_tags_gin on public.capsules using gin (tags);

notify pgrst, 'reload schema';
