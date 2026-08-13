-- Respuestas a comentarios (hilos de 1 nivel).
-- parent_id → comentario raíz; profundidad / misma cápsula se validan en API
-- (sin CHECK con subconsultas).

alter table public.capsule_comments
  add column if not exists parent_id uuid references public.capsule_comments (id) on delete cascade;

create index if not exists capsule_comments_parent_id_idx
  on public.capsule_comments (parent_id)
  where parent_id is not null;

notify pgrst, 'reload schema';
