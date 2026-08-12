-- Atribución de invitaciones: quién trajo a quién (crecimiento).
-- Escritura vía backend (service role); el invitee solo puede leer su fila.

create table if not exists public.invite_attributions (
  invitee_id uuid primary key references auth.users (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null,
  created_at timestamptz not null default now(),
  constraint invite_attributions_no_self check (invitee_id <> inviter_id),
  constraint invite_attributions_code_len check (
    char_length(invite_code) >= 3 and char_length(invite_code) <= 40
  )
);

create index if not exists invite_attributions_inviter_id_idx
  on public.invite_attributions (inviter_id);

create index if not exists invite_attributions_created_at_idx
  on public.invite_attributions (created_at desc);

grant select on public.invite_attributions to authenticated;

alter table public.invite_attributions enable row level security;

drop policy if exists "Invitees can read own attribution" on public.invite_attributions;
create policy "Invitees can read own attribution"
  on public.invite_attributions for select
  to authenticated
  using ((select auth.uid()) = invitee_id);

-- Sin INSERT/UPDATE/DELETE vía client: atribución solo desde API con service role.

notify pgrst, 'reload schema';
