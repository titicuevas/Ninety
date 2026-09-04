-- Remove the empty prototype schema that is no longer used by the application.
-- Keep this explicit and without CASCADE so an unexpected dependency aborts the
-- migration instead of deleting additional objects.
drop table if exists public.comments;
drop table if exists public.likes;
drop table if exists public.photos;
drop table if exists public.friends;
drop table if exists public.matches;
drop table if exists public.teams;
drop table if exists public.competitions;

-- Remove policies left by the prototype. The current Spanish-named policies
-- already cover each operation with restricted roles and cached auth.uid().
drop policy if exists "Public capsules are readable" on public.capsules;
drop policy if exists "Users can create own capsules" on public.capsules;
drop policy if exists "Users can update own capsules" on public.capsules;
drop policy if exists "Users can delete own capsules" on public.capsules;

-- UPDATE policies need both USING and WITH CHECK so ownership cannot be changed.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

notify pgrst, 'reload schema';
