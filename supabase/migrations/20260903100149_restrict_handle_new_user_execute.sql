-- The function is only intended to run from the auth.users trigger. PostgreSQL
-- grants EXECUTE on new functions to PUBLIC by default, so remove that
-- unnecessary direct-call surface while leaving the owner/trigger unaffected.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
