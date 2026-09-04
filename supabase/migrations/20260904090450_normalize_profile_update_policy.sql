-- Converge both the original local policy and the legacy production policy to
-- one authenticated-only UPDATE policy with ownership preserved after UPDATE.
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Usuarios pueden actualizar su propio perfil" on public.profiles;

create policy "Usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

notify pgrst, 'reload schema';
