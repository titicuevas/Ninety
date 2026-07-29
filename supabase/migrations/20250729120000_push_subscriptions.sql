create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index push_subscriptions_user_id on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Solo el backend (service role) gestiona inserts; el usuario puede borrar las suyas
create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

create policy "Users can read own push subscriptions"
  on public.push_subscriptions for select using (auth.uid() = user_id);
