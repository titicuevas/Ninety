-- Alinear esquema remoto: full_name → display_name (compatibilidad con el código)
alter table public.profiles add column if not exists display_name text;

update public.profiles
set display_name = full_name
where display_name is null and full_name is not null;

alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
