-- Digest email semanal del diario (opt-in, default off).
-- Independiente del digest push social. Idempotencia por semana ISO en TZ del usuario.
-- Solo service role escribe el log; el cliente gestiona prefs vía notification_preferences.

alter table public.notification_preferences
  add column if not exists email_digest_enabled boolean not null default false;

create table if not exists public.diary_email_digest_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Semana ISO local: YYYY-Www (p. ej. 2026-W33)
  week_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, week_key),
  constraint diary_email_digest_sent_week_key_check
    check (week_key ~ '^[0-9]{4}-W[0-9]{2}$')
);

create index if not exists diary_email_digest_sent_sent_idx
  on public.diary_email_digest_sent (sent_at desc);

alter table public.diary_email_digest_sent enable row level security;

grant select on public.diary_email_digest_sent to authenticated;

drop policy if exists "Users can read own diary email digest log" on public.diary_email_digest_sent;
create policy "Users can read own diary email digest log"
  on public.diary_email_digest_sent for select
  to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
