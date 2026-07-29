create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('like', 'follow', 'comment')),
  actor_id uuid not null references auth.users(id) on delete cascade,
  capsule_id uuid references public.capsules(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at on public.notifications (user_id, created_at desc);
create index notifications_user_id_unread on public.notifications (user_id) where not read;

alter table public.notifications enable row level security;

create policy "Users can read own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);
