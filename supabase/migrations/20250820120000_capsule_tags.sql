-- Etiquetas propias por Capsule (diario): array text, filtrable en Mis Capsules.
alter table public.capsules
  add column if not exists tags text[] not null default '{}';

alter table public.capsules drop constraint if exists capsules_tags_cardinality_check;
alter table public.capsules
  add constraint capsules_tags_cardinality_check
  check (cardinality(tags) <= 8);

alter table public.capsules drop constraint if exists capsules_tags_elements_check;
alter table public.capsules
  add constraint capsules_tags_elements_check
  check (
    not exists (
      select 1
      from unnest(tags) as t(tag)
      where
        char_length(tag) < 1
        or char_length(tag) > 24
        or tag <> lower(tag)
        or tag <> btrim(tag)
    )
  );

create index if not exists capsules_tags_gin on public.capsules using gin (tags);

notify pgrst, 'reload schema';
