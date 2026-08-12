-- Push opt-in «Quiero ir»: avisar cuando se acerca un partido de la watchlist.
-- Default off. Idempotencia por partido en diary_push_sent (kind want_to_go).
-- Solo service role escribe el log; el cliente gestiona prefs vía notification_preferences.

alter table public.notification_preferences
  add column if not exists push_want_to_go_enabled boolean not null default false;

-- Ampliar kinds de diary_push_sent (constraint inline → nombre {table}_{column}_check).
alter table public.diary_push_sent
  drop constraint if exists diary_push_sent_kind_check;

alter table public.diary_push_sent
  add constraint diary_push_sent_kind_check
  check (kind in ('anniversary', 'milestone', 'want_to_go'));

notify pgrst, 'reload schema';
