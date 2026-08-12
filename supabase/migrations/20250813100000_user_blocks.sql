-- Bloquear usuario: dejar de ver Capsules/perfil (más allá del mute de alertas).
-- Bidireccional en visibilidad: si A↔ B, ninguno ve el contenido del otro vía API.
create table if not exists public.user_blocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  blocked_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);

create index if not exists user_blocks_user_id_idx
  on public.user_blocks (user_id);

create index if not exists user_blocks_blocked_user_id_idx
  on public.user_blocks (blocked_user_id);

grant select, insert, delete on public.user_blocks to authenticated;

alter table public.user_blocks enable row level security;

drop policy if exists "Users can read own blocks" on public.user_blocks;
create policy "Users can read own blocks"
  on public.user_blocks for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own blocks" on public.user_blocks;
create policy "Users can insert own blocks"
  on public.user_blocks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own blocks" on public.user_blocks;
create policy "Users can delete own blocks"
  on public.user_blocks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
