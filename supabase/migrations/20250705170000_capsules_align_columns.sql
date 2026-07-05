-- Alinear public.capsules con el esquema que usa la API (idempotente)
alter table public.capsules add column if not exists match_played_at timestamptz;
alter table public.capsules add column if not exists home_team_crest text;
alter table public.capsules add column if not exists away_team_crest text;
alter table public.capsules add column if not exists competition_name text;
alter table public.capsules add column if not exists home_score smallint;
alter table public.capsules add column if not exists away_score smallint;
alter table public.capsules add column if not exists photo_urls text[] not null default '{}';
alter table public.capsules add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'capsules' and column_name = 'photo_url'
  ) then
    update public.capsules
    set photo_urls = array[photo_url]::text[]
    where photo_url is not null and cardinality(photo_urls) = 0;

    alter table public.capsules drop column photo_url;
  end if;
end $$;

alter table public.capsules drop constraint if exists capsules_photo_urls_check;
alter table public.capsules
  add constraint capsules_photo_urls_check check (cardinality(photo_urls) <= 6);

-- Recargar caché de PostgREST (evita "schema cache" tras añadir columnas)
notify pgrst, 'reload schema';
