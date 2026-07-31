-- Permitir que cada usuario edite el cuerpo de sus propios comentarios
grant update on public.capsule_comments to authenticated;

drop policy if exists "Usuarios editan sus comentarios" on public.capsule_comments;
create policy "Usuarios editan sus comentarios"
  on public.capsule_comments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
