-- Likes en capsules (feed social v2)
create table if not exists public.capsule_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  capsule_id uuid not null references public.capsules (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, capsule_id)
);

create index if not exists capsule_likes_capsule_id_idx on public.capsule_likes (capsule_id);

grant select, insert, delete on public.capsule_likes to authenticated;

alter table public.capsule_likes enable row level security;

drop policy if exists "Likes visibles para aficionados" on public.capsule_likes;
create policy "Likes visibles para aficionados"
  on public.capsule_likes for select
  to authenticated
  using (true);

drop policy if exists "Usuarios dan like" on public.capsule_likes;
create policy "Usuarios dan like"
  on public.capsule_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios quitan su like" on public.capsule_likes;
create policy "Usuarios quitan su like"
  on public.capsule_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
