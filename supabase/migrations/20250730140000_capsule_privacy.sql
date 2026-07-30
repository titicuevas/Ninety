-- Privacidad por Capsule: pública (default) o solo el dueño.
alter table public.capsules
  add column if not exists is_public boolean not null default true;

create index if not exists capsules_is_public_idx
  on public.capsules (is_public)
  where is_public = true;

drop policy if exists "Aficionados ven todas las capsules" on public.capsules;
drop policy if exists "Feed: capsules visibles para aficionados" on public.capsules;
drop policy if exists "Usuarios ven sus capsules" on public.capsules;
drop policy if exists "Ver capsules públicas o propias" on public.capsules;

create policy "Ver capsules públicas o propias"
  on public.capsules for select
  to authenticated
  using (is_public = true or (select auth.uid()) = user_id);

-- Lectura anónima de capsules públicas (OG / perfiles sin sesión vía Data API si aplica).
grant select on public.capsules to anon;

drop policy if exists "Anónimos ven capsules públicas" on public.capsules;
create policy "Anónimos ven capsules públicas"
  on public.capsules for select
  to anon
  using (is_public = true);

notify pgrst, 'reload schema';
