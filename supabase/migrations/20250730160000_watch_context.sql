-- Dónde viste el partido (contexto estructurado del diario).
alter table public.capsules
  add column if not exists watch_context text;

alter table public.capsules drop constraint if exists capsules_watch_context_check;
alter table public.capsules
  add constraint capsules_watch_context_check
  check (watch_context is null or watch_context in ('stadium', 'tv', 'pub', 'other'));

notify pgrst, 'reload schema';
