-- Supabase Storage: fotos de Capsules
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capsule-photos',
  'capsule-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Lectura pública de fotos
drop policy if exists "Fotos públicas visibles" on storage.objects;
create policy "Fotos públicas visibles"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'capsule-photos');

-- Subir solo a tu carpeta de usuario
drop policy if exists "Usuarios suben sus fotos" on storage.objects;
create policy "Usuarios suben sus fotos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'capsule-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Actualizar solo tus fotos (requerido para upsert)
drop policy if exists "Usuarios actualizan sus fotos" on storage.objects;
create policy "Usuarios actualizan sus fotos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'capsule-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'capsule-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Borrar solo tus fotos
drop policy if exists "Usuarios borran sus fotos" on storage.objects;
create policy "Usuarios borran sus fotos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'capsule-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Realtime: cambios en perfiles (preparado para feed social)
alter publication supabase_realtime add table public.profiles;
