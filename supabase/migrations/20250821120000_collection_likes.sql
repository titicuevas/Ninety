-- Me gusta en colecciones públicas (señal social ligera).
-- Visibilidad / solo-públicas ajenas: se aplica en API (sin CHECK con subconsultas).

create table if not exists public.collection_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, collection_id)
);

create index if not exists collection_likes_collection_id_idx
  on public.collection_likes (collection_id);

grant select, insert, delete on public.collection_likes to authenticated;
grant select on public.collection_likes to anon;

alter table public.collection_likes enable row level security;

drop policy if exists "Likes de colecciones visibles" on public.collection_likes;
create policy "Likes de colecciones visibles"
  on public.collection_likes for select
  to authenticated
  using (true);

drop policy if exists "Anónimos ven likes de colecciones" on public.collection_likes;
create policy "Anónimos ven likes de colecciones"
  on public.collection_likes for select
  to anon
  using (true);

drop policy if exists "Usuarios dan like a colecciones" on public.collection_likes;
create policy "Usuarios dan like a colecciones"
  on public.collection_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios quitan like de colecciones" on public.collection_likes;
create policy "Usuarios quitan like de colecciones"
  on public.collection_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
