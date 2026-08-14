-- Archivo «Mis me gusta»: listar likes de un usuario por fecha.
create index if not exists capsule_likes_user_created_idx
  on public.capsule_likes (user_id, created_at desc);

notify pgrst, 'reload schema';
