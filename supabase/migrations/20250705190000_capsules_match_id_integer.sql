-- match_id = ID numérico de football-data.org (no FK a tabla local matches)
alter table public.capsules drop constraint if exists capsules_match_id_fkey;

do $$
declare
  col_type text;
begin
  select data_type
  into col_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'capsules'
    and column_name = 'match_id';

  if col_type = 'uuid' then
    alter table public.capsules
      alter column match_id type integer using 0;
  end if;
end $$;

-- Restaurar unicidad usuario + partido (por si faltaba)
alter table public.capsules drop constraint if exists capsules_user_id_match_id_key;
alter table public.capsules
  add constraint capsules_user_id_match_id_key unique (user_id, match_id);

notify pgrst, 'reload schema';
