-- Push opcional de aniversarios («Tal día como hoy») e hitos del diario.
-- Opt-in (default off). Idempotencia por evento en diary_push_sent.
-- Solo service role escribe el log; el cliente gestiona prefs vía notification_preferences.

alter table public.notification_preferences
  add column if not exists push_anniversary_enabled boolean not null default false,
  add column if not exists push_milestone_enabled boolean not null default false;

create table if not exists public.diary_push_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('anniversary', 'milestone')),
  -- anniversary: día local YYYY-MM-DD; milestone: umbral como texto ('5', '25', …)
  event_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, event_key),
  constraint diary_push_sent_event_key_len check (char_length(event_key) between 1 and 64)
);

create index if not exists diary_push_sent_user_sent_idx
  on public.diary_push_sent (user_id, sent_at desc);

alter table public.diary_push_sent enable row level security;

-- Lectura propia (debug / futuro UI); escrituras solo service role (bypass RLS).
grant select on public.diary_push_sent to authenticated;

drop policy if exists "Users can read own diary push log" on public.diary_push_sent;
create policy "Users can read own diary push log"
  on public.diary_push_sent for select
  to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
