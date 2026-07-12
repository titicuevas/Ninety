-- Seguir usuarios (feed social v2)
create table if not exists public.user_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

create index if not exists user_follows_follower_id_idx on public.user_follows (follower_id);
create index if not exists user_follows_following_id_idx on public.user_follows (following_id);

grant select, insert, delete on public.user_follows to authenticated;

alter table public.user_follows enable row level security;

drop policy if exists "Follows visibles para aficionados" on public.user_follows;
create policy "Follows visibles para aficionados"
  on public.user_follows for select
  to authenticated
  using (true);

drop policy if exists "Usuarios siguen a otros" on public.user_follows;
create policy "Usuarios siguen a otros"
  on public.user_follows for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

drop policy if exists "Usuarios dejan de seguir" on public.user_follows;
create policy "Usuarios dejan de seguir"
  on public.user_follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

notify pgrst, 'reload schema';
