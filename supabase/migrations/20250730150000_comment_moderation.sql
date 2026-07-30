-- El dueño de la Capsule puede borrar comentarios ajenos (moderación).
drop policy if exists "Usuarios borran sus comentarios" on public.capsule_comments;
drop policy if exists "Autor o dueño borra comentarios" on public.capsule_comments;

create policy "Autor o dueño borra comentarios"
  on public.capsule_comments for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.capsules c
      where c.id = capsule_id
        and c.user_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
