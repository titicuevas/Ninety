-- Respuestas a comentarios de colección (hilos de 1 nivel).
-- parent_id → comentario raíz; profundidad / misma colección se validan en API.

alter table public.collection_comments
  add column if not exists parent_id uuid references public.collection_comments (id) on delete cascade;

create index if not exists collection_comments_parent_id_idx
  on public.collection_comments (parent_id)
  where parent_id is not null;

notify pgrst, 'reload schema';
