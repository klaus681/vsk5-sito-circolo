-- ============================================================
-- CVI Virtual – Test manuali RLS (Sprint 2, punto 1)
-- ------------------------------------------------------------
-- Eseguire DOPO security-rls-hardening-sql.sql.
-- Sostituire:
--   SOCIO_UUID  con l'id di un profilo con role='socio'
--   ADMIN_UUID  con l'id di un profilo admin
--   GARA_UUID   con l'id di una gara esistente
-- Ogni blocco è in transazione e termina con rollback:
-- non modifica i dati.
-- ============================================================
-- 0) Diagnostica stato (read-only)
select
  to_regclass('public.profiles_public') as profiles_public,
  to_regprocedure('public.is_club_staff()') as is_club_staff;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'site_settings')
order by tablename, policyname;

-- Se profiles_public è NULL o is_club_staff è NULL, la migrazione
-- non è stata applicata (o è andata in rollback).

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

-- ============================================================
-- gare_password (eseguire dopo gare-password-sql.sql)
-- ============================================================

-- 9) Diagnostica: tabella presente, RLS attiva, 2 policy
select
  to_regclass('public.gare_password') as gare_password,
  (select relrowsecurity from pg_class
    where oid = to_regclass('public.gare_password')) as rls_attiva;

select policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'gare_password'
order by policyname;
-- Atteso: 2 policy (gare_password_admin_all, gare_password_auth_read)

-- 10) Anon non deve poter leggere le password delle gare
begin;
set local role anon;
select count(*) from public.gare_password;
-- Atteso: ERROR: permission denied for table gare_password
rollback;

-- 11) Socio loggato: può leggere le password
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"SOCIO_UUID","role":"authenticated"}';
select count(*) from public.gare_password;
-- Atteso: nessun errore (le righe dipendono dalle gare configurate)
rollback;

-- 12) Socio loggato: non può scrivere le password
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"SOCIO_UUID","role":"authenticated"}';
insert into public.gare_password (gara_id, password)
values ('GARA_UUID', 'test');
-- Atteso: ERROR: new row violates row-level security policy
rollback;

-- 13) Admin: può creare/aggiornare la password di una gara
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"ADMIN_UUID","role":"authenticated"}';
insert into public.gare_password (gara_id, password)
values ('GARA_UUID', 'test')
on conflict (gara_id) do update set password = excluded.password;
-- Atteso: INSERT 0 1
rollback;

