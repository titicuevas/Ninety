-- Comentarios en colecciones públicas (charla en la lista).
-- Solo-públicas ajenas / blocks: se aplican en API (sin CHECK con subconsultas).

create table if not exists public.collection_comments (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 500),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists collection_comments_collection_id_idx
  on public.collection_comments (collection_id, created_at);

grant select, insert, update, delete on public.collection_comments to authenticated;
grant select on public.collection_comments to anon;

alter table public.collection_comments enable row level security;

drop policy if exists "Comentarios de colecciones visibles" on public.collection_comments;
create policy "Comentarios de colecciones visibles"
  on public.collection_comments for select
  to authenticated
  using (true);

drop policy if exists "Anónimos ven comentarios de colecciones" on public.collection_comments;
create policy "Anónimos ven comentarios de colecciones"
  on public.collection_comments for select
  to anon
  using (true);

drop policy if exists "Usuarios comentan colecciones" on public.collection_comments;
create policy "Usuarios comentan colecciones"
  on public.collection_comments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios editan sus comentarios de colección" on public.collection_comments;
create policy "Usuarios editan sus comentarios de colección"
  on public.collection_comments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Autor o dueño de la colección (moderación).
drop policy if exists "Autor o dueño borra comentarios de colección" on public.collection_comments;
create policy "Autor o dueño borra comentarios de colección"
  on public.collection_comments for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.collections c
      where c.id = collection_id
        and c.user_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
