-- Like en colección: alerta in-app (+ digest push) reutilizando prefs de likes.
-- Tipo `collection_like` + columna collection_id (capsule_id sigue para Capsules).

alter table public.notifications
  add column if not exists collection_id uuid references public.collections (id) on delete cascade;

create index if not exists notifications_collection_id_idx
  on public.notifications (collection_id)
  where collection_id is not null;

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('like', 'follow', 'comment', 'mention', 'collection_like'));

notify pgrst, 'reload schema';
