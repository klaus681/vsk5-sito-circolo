-- ============================================
-- CVI Virtual – Sicurezza Area Download
-- Esegui UNA VOLTA nel SQL Editor di Supabase
-- ============================================
-- La tabella "downloads" era leggibile da chiunque (policy for select using (true)):
-- l'Area Download risultava "riservata" solo visivamente, ma gli URL dei file
-- erano elencabili via API. Questo script la limita agli utenti autenticati.

drop policy if exists "downloads_public_read" on public.downloads;

-- La policy "downloads_auth_write" (for all to authenticated) copre lettura e
-- scrittura per gli utenti autenticati. Se non esiste, la creiamo.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'downloads' and policyname = 'downloads_auth_write'
  ) then
    create policy "downloads_auth_write" on public.downloads
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Colonne opzionali per file privati su Storage (signed URL dal pannello admin).
alter table public.downloads add column if not exists bucket text;
alter table public.downloads add column if not exists private_path text;

-- NOTA sul bucket Storage "downloads": se è pubblico (public = true) i file
-- restano raggiungibili tramite URL diretto. Per una protezione completa dei
-- file servirebbe un bucket privato + signed URL. Qui proteggiamo l'elenco.
