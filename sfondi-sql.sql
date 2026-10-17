-- CVI: Storage per sfondi home (opzionale se usi gia bucket gallery)
-- Esegui nel SQL Editor di Supabase se l'upload da Admin - Sfondi fallisce.

-- 1) Crea bucket pubblico (se non esiste)
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = true;

-- 2) Lettura pubblica
drop policy if exists "Public read site-assets" on storage.objects;
create policy "Public read site-assets"
  on storage.objects for select
  using (bucket_id = 'site-assets');

-- 3) Upload solo utenti autenticati (admin loggato)
drop policy if exists "Auth upload site-assets" on storage.objects;
create policy "Auth upload site-assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-assets');

-- 4) Update (upsert) autenticati
drop policy if exists "Auth update site-assets" on storage.objects;
create policy "Auth update site-assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-assets');

-- Le chiavi in site_settings usate:
--   home_bg_hero
--   home_bg_next_race
--   home_bg_torneo
-- (tabella site_settings gia esistente sul progetto)
