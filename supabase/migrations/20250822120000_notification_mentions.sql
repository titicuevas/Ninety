-- Mentions en comentarios: tipo de alerta 'mention'.
-- Solo amplía el CHECK de notifications.type (sin subconsultas).

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('like', 'follow', 'comment', 'mention'));

notify pgrst, 'reload schema';
