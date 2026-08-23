-- Harden legacy notification policies and avoid evaluating auth.uid() per row.
-- These tables are written by the backend with service_role; authenticated users
-- only receive the operations explicitly described by their RLS policies.

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own push subscriptions" on public.push_subscriptions;
create policy "Users can read own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own notification preferences" on public.notification_preferences;
create policy "Users can read own notification preferences"
  on public.notification_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own notification preferences" on public.notification_preferences;
create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- PostgreSQL does not automatically index referencing foreign-key columns.
-- These indexes prevent full scans when an actor or capsule is deleted.
create index if not exists notifications_actor_id_idx
  on public.notifications (actor_id);

create index if not exists notifications_capsule_id_idx
  on public.notifications (capsule_id)
  where capsule_id is not null;

-- Trigger functions do not need to be directly executable through the Data API.
revoke all on function public.handle_new_user() from public, anon, authenticated;

notify pgrst, 'reload schema';
