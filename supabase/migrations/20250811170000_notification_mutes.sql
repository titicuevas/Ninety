-- Silenciar usuario concreto: no recibir alertas (in-app + push) de un actor.
-- No afecta follow, feed ni historial previo.
create table if not exists public.notification_mutes (
  user_id uuid not null references auth.users (id) on delete cascade,
  muted_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_user_id),
  check (user_id <> muted_user_id)
);

create index if not exists notification_mutes_user_id_idx
  on public.notification_mutes (user_id);

create index if not exists notification_mutes_muted_user_id_idx
  on public.notification_mutes (muted_user_id);

grant select, insert, delete on public.notification_mutes to authenticated;

alter table public.notification_mutes enable row level security;

drop policy if exists "Users can read own notification mutes" on public.notification_mutes;
create policy "Users can read own notification mutes"
  on public.notification_mutes for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own notification mutes" on public.notification_mutes;
create policy "Users can insert own notification mutes"
  on public.notification_mutes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own notification mutes" on public.notification_mutes;
create policy "Users can delete own notification mutes"
  on public.notification_mutes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
