alter table public.capsules
  add column if not exists photo_url text check (photo_url is null or char_length(photo_url) <= 2048);
