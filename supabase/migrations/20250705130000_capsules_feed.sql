-- Feed social: los aficionados autenticados pueden ver todas las capsules.
-- INSERT/UPDATE/DELETE siguen restringidos al dueño.

drop policy if exists "Usuarios ven sus capsules" on public.capsules;
drop policy if exists "Feed: capsules visibles para aficionados" on public.capsules;
drop policy if exists "Aficionados ven todas las capsules" on public.capsules;

create policy "Aficionados ven todas las capsules"
  on public.capsules for select
  to authenticated
  using (true);
