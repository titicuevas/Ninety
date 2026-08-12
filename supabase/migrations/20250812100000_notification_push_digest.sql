-- Digest de push: agrupa alertas periódicas en lugar de un push por evento.
alter table public.notifications
  add column if not exists push_sent_at timestamptz;

create index if not exists notifications_push_pending
  on public.notifications (user_id, created_at)
  where push_sent_at is null;
