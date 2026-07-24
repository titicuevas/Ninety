-- Raise capsule photo limit from 6 to 9
alter table public.capsules drop constraint if exists capsules_photo_urls_check;
alter table public.capsules
  add constraint capsules_photo_urls_check check (cardinality(photo_urls) <= 9);
