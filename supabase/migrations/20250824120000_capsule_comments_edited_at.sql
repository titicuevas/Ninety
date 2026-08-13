-- Historial mínimo al editar comentarios propios.
alter table public.capsule_comments
  add column if not exists edited_at timestamptz;

notify pgrst, 'reload schema';
