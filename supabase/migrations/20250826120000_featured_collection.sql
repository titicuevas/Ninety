-- Pin de una colección pública en el perfil.
-- Ownership / is_public se validan en API (sin CHECK con subconsultas).

alter table public.profiles
  add column if not exists featured_collection_id uuid
    references public.collections (id) on delete set null;

create index if not exists profiles_featured_collection_id_idx
  on public.profiles (featured_collection_id)
  where featured_collection_id is not null;

notify pgrst, 'reload schema';
