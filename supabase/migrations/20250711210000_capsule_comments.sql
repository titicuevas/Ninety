-- Comentarios en capsules (feed social v2)
create table if not exists public.capsule_comments (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.capsules (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists capsule_comments_capsule_id_idx on public.capsule_comments (capsule_id, created_at);

grant select, insert, delete on public.capsule_comments to authenticated;

alter table public.capsule_comments enable row level security;

drop policy if exists "Comentarios visibles para aficionados" on public.capsule_comments;
create policy "Comentarios visibles para aficionados"
  on public.capsule_comments for select
  to authenticated
  using (true);

drop policy if exists "Usuarios comentan" on public.capsule_comments;
create policy "Usuarios comentan"
  on public.capsule_comments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios borran sus comentarios" on public.capsule_comments;
create policy "Usuarios borran sus comentarios"
  on public.capsule_comments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
