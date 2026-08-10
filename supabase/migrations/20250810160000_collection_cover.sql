-- Portada de colección: Capsule destacada (foto como cover en listas / OG)
alter table public.collections
  add column if not exists cover_capsule_id uuid references public.capsules (id) on delete set null;

create index if not exists collections_cover_capsule_id_idx
  on public.collections (cover_capsule_id);

notify pgrst, 'reload schema';
