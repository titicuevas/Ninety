-- Actividad de follows: listar comentarios de un usuario por fecha.
create index if not exists capsule_comments_user_created_idx
  on public.capsule_comments (user_id, created_at desc);

create index if not exists collection_comments_user_created_idx
  on public.collection_comments (user_id, created_at desc);

notify pgrst, 'reload schema';
