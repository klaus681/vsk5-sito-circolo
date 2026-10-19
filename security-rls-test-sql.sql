-- ============================================================
-- CVI Virtual – Test manuali RLS (Sprint 2, punto 1)
-- ------------------------------------------------------------
-- Eseguire DOPO security-rls-hardening-sql.sql.
-- Sostituire:
--   SOCIO_UUID  con l'id di un profilo con role='socio'
--   ADMIN_UUID  con l'id di un profilo admin
-- Ogni blocco è in transazione e termina con rollback:
-- non modifica i dati.
-- ============================================================

-- 1) Anon non deve poter leggere profiles
begin;
set local role anon;
select count(*) from public.profiles;
-- Atteso: ERROR: permission denied for table profiles
rollback;

-- 2) Anon non deve vedere i webhook in site_settings
begin;
set local role anon;
select key from public.site_settings where key ilike '%webhook%';
-- Atteso: 0 righe
select key from public.site_settings order by key;
-- Atteso: solo chiavi pubbliche (home_*, sfondi_*, regolamento_*, ecc.)
rollback;

-- 3) Anon deve poter leggere solo le colonne pubbliche
begin;
set local role anon;
select * from public.profiles_public limit 1;
-- Atteso: OK, nessuna colonna email
rollback;

-- 4) Socio: vede solo il proprio profilo nella tabella
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"SOCIO_UUID","role":"authenticated"}';
select count(*) from public.profiles;
-- Atteso: 1
select count(*) from public.profiles_public;
-- Atteso: tutti i profili (solo colonne pubbliche)
rollback;

-- 5) Socio: non può promuoversi ad admin
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"SOCIO_UUID","role":"authenticated"}';
update public.profiles set is_admin = true where id = 'SOCIO_UUID';
-- Atteso: ERROR: Non autorizzato a modificare role/is_admin
rollback;

-- 6) Socio: può aggiornare i propri dati non sensibili
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"SOCIO_UUID","role":"authenticated"}';
update public.profiles set nickname = nickname where id = 'SOCIO_UUID';
-- Atteso: UPDATE 1
rollback;

-- 7) Admin: vede tutti i profili e può cambiare ruolo
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"ADMIN_UUID","role":"authenticated"}';
select count(*) from public.profiles;
-- Atteso: tutti i profili
select key from public.site_settings where key ilike '%webhook%';
-- Atteso: le chiavi webhook (solo admin)
rollback;

-- 8) Admin: può cambiare il ruolo di un socio
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"ADMIN_UUID","role":"authenticated"}';
update public.profiles set role = 'socio', is_admin = false where id = 'SOCIO_UUID';
-- Atteso: UPDATE 1
rollback;
