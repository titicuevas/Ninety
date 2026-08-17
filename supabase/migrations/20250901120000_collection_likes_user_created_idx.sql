-- Archivo «listas que te gustaron»: listar likes de un usuario por fecha.
create index if not exists collection_likes_user_created_idx
  on public.collection_likes (user_id, created_at desc);

notify pgrst, 'reload schema';
