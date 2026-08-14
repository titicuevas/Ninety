-- Reportes de colecciones públicas (paridad con Capsule).
alter type public.content_report_target_type add value if not exists 'collection';

notify pgrst, 'reload schema';
