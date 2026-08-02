-- Colecciones del diario: listas curadas de Capsules (estilo Letterboxd)
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_name_len check (char_length(name) between 1 and 80),
  constraint collections_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint collections_slug_len check (char_length(slug) between 1 and 80),
  constraint collections_description_len check (description is null or char_length(description) <= 500),
  unique (user_id, slug)
);

create index if not exists collections_user_id_idx on public.collections (user_id);
create index if not exists collections_public_user_idx
  on public.collections (user_id)
  where is_public = true;

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  capsule_id uuid not null references public.capsules (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, capsule_id),
  constraint collection_items_position_nonneg check (position >= 0)
);

create index if not exists collection_items_capsule_id_idx on public.collection_items (capsule_id);
create index if not exists collection_items_collection_pos_idx
  on public.collection_items (collection_id, position);

grant select, insert, update, delete on public.collections to authenticated;
grant select on public.collections to anon;
grant select, insert, update, delete on public.collection_items to authenticated;
grant select on public.collection_items to anon;

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "Ver colecciones públicas o propias" on public.collections;
create policy "Ver colecciones públicas o propias"
  on public.collections for select
  to authenticated
  using (is_public = true or (select auth.uid()) = user_id);

drop policy if exists "Anónimos ven colecciones públicas" on public.collections;
create policy "Anónimos ven colecciones públicas"
  on public.collections for select
  to anon
  using (is_public = true);

drop policy if exists "Usuarios crean colecciones" on public.collections;
create policy "Usuarios crean colecciones"
  on public.collections for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios actualizan colecciones" on public.collections;
create policy "Usuarios actualizan colecciones"
  on public.collections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios eliminan colecciones" on public.collections;
create policy "Usuarios eliminan colecciones"
  on public.collections for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Ver ítems de colecciones visibles" on public.collection_items;
create policy "Ver ítems de colecciones visibles"
  on public.collection_items for select
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (c.is_public = true or c.user_id = (select auth.uid()))
    )
  );

drop policy if exists "Anónimos ven ítems de colecciones públicas" on public.collection_items;
create policy "Anónimos ven ítems de colecciones públicas"
  on public.collection_items for select
  to anon
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.is_public = true
    )
  );

drop policy if exists "Dueños añaden ítems" on public.collection_items;
create policy "Dueños añaden ítems"
  on public.collection_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.capsules cap
      where cap.id = capsule_id and cap.user_id = (select auth.uid())
    )
  );

drop policy if exists "Dueños actualizan ítems" on public.collection_items;
create policy "Dueños actualizan ítems"
  on public.collection_items for update
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Dueños eliminan ítems" on public.collection_items;
create policy "Dueños eliminan ítems"
  on public.collection_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
