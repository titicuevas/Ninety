-- Preferencias de alertas por tipo (like / comment / follow).
-- false = silenciar in-app + push para ese tipo. Sin emails.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  likes_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  follows_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can read own notification preferences" on public.notification_preferences;
create policy "Users can read own notification preferences"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own notification preferences" on public.notification_preferences;
create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
