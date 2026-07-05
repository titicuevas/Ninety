-- Recuerdos de partidos vistos (Capsules)
create table if not exists public.capsules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id integer not null,
  match_played_at timestamptz,
  home_team_name text not null,
  away_team_name text not null,
  home_team_crest text,
  away_team_crest text,
  competition_name text,
  home_score smallint,
  away_score smallint,
  watched_at date not null,
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

grant select, insert, update, delete on public.capsules to authenticated;

alter table public.capsules enable row level security;

drop policy if exists "Usuarios ven sus capsules" on public.capsules;
create policy "Usuarios ven sus capsules"
  on public.capsules for select
  to authenticated
  using ((select auth.uid()) = user_id);

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

create index if not exists capsules_user_id_idx on public.capsules (user_id);
create index if not exists capsules_user_created_idx on public.capsules (user_id, created_at desc);
