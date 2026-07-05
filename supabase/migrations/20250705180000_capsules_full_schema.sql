-- Esquema completo de capsules (idempotente — repara tablas incompletas)
alter table public.capsules add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.capsules add column if not exists match_id integer;
alter table public.capsules add column if not exists match_played_at timestamptz;
alter table public.capsules add column if not exists home_team_name text;
alter table public.capsules add column if not exists away_team_name text;
alter table public.capsules add column if not exists home_team_crest text;
alter table public.capsules add column if not exists away_team_crest text;
alter table public.capsules add column if not exists competition_name text;
alter table public.capsules add column if not exists home_score smallint;
alter table public.capsules add column if not exists away_score smallint;
alter table public.capsules add column if not exists watched_at date;
alter table public.capsules add column if not exists rating smallint;
alter table public.capsules add column if not exists note text;
alter table public.capsules add column if not exists photo_urls text[] not null default '{}';
alter table public.capsules add column if not exists created_at timestamptz not null default now();
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

grant select, insert, update, delete on public.capsules to authenticated;
alter table public.capsules enable row level security;

drop policy if exists "Aficionados ven todas las capsules" on public.capsules;
create policy "Aficionados ven todas las capsules"
  on public.capsules for select
  to authenticated
  using (true);

drop policy if exists "Usuarios crean sus capsules" on public.capsules;
create policy "Usuarios crean sus capsules"
  on public.capsules for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios actualizan sus capsules" on public.capsules;
create policy "Usuarios actualizan sus capsules"
  on public.capsules for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios eliminan sus capsules" on public.capsules;
create policy "Usuarios eliminan sus capsules"
  on public.capsules for delete
  to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';

-- match_id debe ser integer (IDs de football-data.org, sin FK a matches)
alter table public.capsules drop constraint if exists capsules_match_id_fkey;

do $$
declare
  col_type text;
begin
  select data_type
  into col_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'capsules'
    and column_name = 'match_id';

  if col_type = 'uuid' then
    alter table public.capsules
      alter column match_id type integer using 0;
  end if;
end $$;

alter table public.capsules drop constraint if exists capsules_user_id_match_id_key;
alter table public.capsules
  add constraint capsules_user_id_match_id_key unique (user_id, match_id);

notify pgrst, 'reload schema';
