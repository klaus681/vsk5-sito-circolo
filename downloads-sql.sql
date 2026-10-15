-- ============================================
-- CVI Virtual – tabella downloads + Storage bucket
-- Esegui questo SQL nel SQL Editor di Supabase.
--
-- Nota: il pannello Admin → Download funziona gia' senza questo SQL,
-- perche' in assenza del bucket "downloads" usa automaticamente il
-- bucket "gallery". Questo script serve per avere un bucket dedicato
-- (piu' ordinato) e una tabella downloads con le colonne corrette.
-- ============================================

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  titolo text not null,
  descrizione text,
  url text not null,
  tipo text default 'file',
  ordine int default 0,
  attivo boolean default true
);

alter table public.downloads enable row level security;

-- Lettura pubblica (la pagina Download e' visibile a tutti)
drop policy if exists "downloads_public_read" on public.downloads;
create policy "downloads_public_read" on public.downloads
  for select using (true);

-- Scrittura da parte degli utenti autenticati (il pannello admin e' gia' protetto)
drop policy if exists "downloads_auth_write" on public.downloads;
create policy "downloads_auth_write" on public.downloads
  for all to authenticated using (true) with check (true);

-- ============================================
-- Storage: bucket pubblico "downloads" (max 50 MB per file)
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('downloads', 'downloads', true, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "downloads_storage_public_read" on storage.objects;
create policy "downloads_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'downloads');

drop policy if exists "downloads_storage_write" on storage.objects;
create policy "downloads_storage_write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'downloads');

drop policy if exists "downloads_storage_update" on storage.objects;
create policy "downloads_storage_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'downloads');

drop policy if exists "downloads_storage_delete" on storage.objects;
create policy "downloads_storage_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'downloads');
