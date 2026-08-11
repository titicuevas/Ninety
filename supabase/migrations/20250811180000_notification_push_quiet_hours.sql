-- Horario silencioso de push: franja local (timezone del dispositivo) sin push.
-- Las alertas in-app siguen creándose. Sin emails.
alter table public.notification_preferences
  add column if not exists push_quiet_enabled boolean not null default false,
  add column if not exists push_quiet_start time not null default '22:00',
  add column if not exists push_quiet_end time not null default '08:00',
  add column if not exists push_quiet_timezone text not null default 'UTC';

alter table public.notification_preferences
  drop constraint if exists notification_preferences_push_quiet_timezone_check;

alter table public.notification_preferences
  add constraint notification_preferences_push_quiet_timezone_check
  check (char_length(push_quiet_timezone) between 1 and 64);

notify pgrst, 'reload schema';
