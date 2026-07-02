-- Perfiles públicos de usuario (extiende auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  favorite_team text,
  country text,
  city text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exponer tabla a la Data API
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to anon, authenticated;

-- Trigger: crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;

drop policy if exists "Perfiles públicos son visibles para todos" on public.profiles;
create policy "Perfiles públicos son visibles para todos"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Usuarios pueden actualizar su propio perfil" on public.profiles;
create policy "Usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Usuarios pueden insertar su propio perfil" on public.profiles;
create policy "Usuarios pueden insertar su propio perfil"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create index if not exists profiles_username_idx on public.profiles (username);
