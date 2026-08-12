-- Reportes de abuso: usuario o Capsule (cola admin-ready vía service role).
-- El client solo puede insertar/leer los suyos; no hay panel admin en esta migración.

do $$ begin
  create type public.content_report_target_type as enum ('user', 'capsule');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_report_reason as enum (
    'spam',
    'harassment',
    'hate',
    'inappropriate',
    'impersonation',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type public.content_report_target_type not null,
  target_id uuid not null,
  reason public.content_report_reason not null,
  note text,
  created_at timestamptz not null default now(),
  constraint content_reports_note_len check (note is null or char_length(note) <= 500),
  constraint content_reports_no_self_user check (
    target_type <> 'user' or reporter_id <> target_id
  )
);

-- Anti-spam: un reporte por reporter + objetivo.
create unique index if not exists content_reports_reporter_target_uidx
  on public.content_reports (reporter_id, target_type, target_id);

create index if not exists content_reports_created_at_idx
  on public.content_reports (created_at desc);

create index if not exists content_reports_target_idx
  on public.content_reports (target_type, target_id);

grant select, insert on public.content_reports to authenticated;

alter table public.content_reports enable row level security;

drop policy if exists "Users can insert own reports" on public.content_reports;
create policy "Users can insert own reports"
  on public.content_reports for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

drop policy if exists "Users can read own reports" on public.content_reports;
create policy "Users can read own reports"
  on public.content_reports for select
  to authenticated
  using ((select auth.uid()) = reporter_id);

-- Sin UPDATE/DELETE vía client: cola inmutable para moderación (service_role bypassa RLS).

notify pgrst, 'reload schema';
