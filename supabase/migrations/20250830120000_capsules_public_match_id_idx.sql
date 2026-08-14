-- Quién más vio este partido: lookup de Capsules públicas por match_id.
create index if not exists capsules_public_match_id_idx
  on public.capsules (match_id)
  where is_public = true;

notify pgrst, 'reload schema';
