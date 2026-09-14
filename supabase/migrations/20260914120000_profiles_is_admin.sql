-- Rol interno admin para métricas de producto (solo service role puede elevar).
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Privilegio interno Ninety (panel /admin). No editable por el propio usuario.';

create index if not exists profiles_is_admin_idx
  on public.profiles (id)
  where is_admin = true;

-- Impide auto-promoción vía Data API / RLS (clientes authenticated/anon).
create or replace function public.protect_profiles_is_admin()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin then
    -- Solo bloquea roles de cliente; service_role y sesiones SQL de migración pueden elevar.
    if coalesce(auth.role(), '') in ('authenticated', 'anon') then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profiles_is_admin on public.profiles;
create trigger trg_protect_profiles_is_admin
  before update on public.profiles
  for each row
  execute function public.protect_profiles_is_admin();

revoke all on function public.protect_profiles_is_admin() from public;
revoke all on function public.protect_profiles_is_admin() from anon, authenticated;

notify pgrst, 'reload schema';
