-- Producción exige username NOT NULL; el trigger histórico no lo rellenaba → signup 500.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_name text;
  base_username text;
  final_username text;
  suffix text;
begin
  meta_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  base_username := lower(regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-z0-9_]', '', 'g'));
  if base_username is null or length(base_username) < 3 then
    base_username := 'user';
  end if;
  base_username := left(base_username, 20);

  final_username := base_username;
  if exists (select 1 from public.profiles p where p.username = final_username) then
    suffix := substr(replace(new.id::text, '-', ''), 1, 8);
    final_username := left(base_username, 12) || suffix;
  end if;

  insert into public.profiles (id, username, full_name, display_name)
  values (new.id, final_username, meta_name, meta_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

notify pgrst, 'reload schema';
