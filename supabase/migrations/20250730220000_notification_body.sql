-- Snippet opcional en notificaciones (p.ej. texto del comentario)
alter table public.notifications
  add column if not exists body text;

comment on column public.notifications.body is
  'Texto corto asociado (comentario). Snapshot al crear la notificación.';
