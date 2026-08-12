-- Lista «Quiero ir»: partidos futuros/interesantes (watchlist Letterboxd-style).
-- Snapshot denormalizado: no hay tabla local de matches (catálogo API + manuales).

create table if not exists public.want_to_go_matches (
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
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (user_id, match_id),
  constraint want_to_go_matches_match_id_nonzero check (match_id <> 0),
  constraint want_to_go_team_names_nonempty check (
    char_length(trim(home_team_name)) > 0
    and char_length(trim(away_team_name)) > 0
  )
);

create index if not exists want_to_go_matches_user_created_idx
  on public.want_to_go_matches (user_id, created_at desc);

create index if not exists want_to_go_matches_user_played_idx
  on public.want_to_go_matches (user_id, match_played_at desc nulls last);

grant select, insert, delete on public.want_to_go_matches to authenticated;

alter table public.want_to_go_matches enable row level security;

drop policy if exists "Usuarios ven su Quiero ir" on public.want_to_go_matches;
create policy "Usuarios ven su Quiero ir"
  on public.want_to_go_matches for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Usuarios añaden a Quiero ir" on public.want_to_go_matches;
create policy "Usuarios añaden a Quiero ir"
  on public.want_to_go_matches for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios quitan de Quiero ir" on public.want_to_go_matches;
create policy "Usuarios quitan de Quiero ir"
  on public.want_to_go_matches for delete
  to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
