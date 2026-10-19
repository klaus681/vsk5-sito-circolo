-- ============================================================
-- CVI Virtual – Audit privacy / RLS della tabella public.profiles
-- Script di SOLA LETTURA: puoi eseguirlo più volte.
-- ============================================================
-- Serve a verificare cosa espone oggi l'API /profiles e quali policy
-- sono attive. Le modifiche consigliate sono in fondo, commentate:
-- valutale dopo aver letto i risultati dell'audit.

-- 1) Colonne presenti (cerca email, note interne, campi sensibili)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;

-- 2) RLS attiva sulla tabella?
select c.relname,
       c.relrowsecurity  as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'profiles';

-- 3) Policy attive (ruoli, comandi, condizioni)
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;

-- 4) Grant espliciti per anon / authenticated
select grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- 5) Quanti profili hanno email valorizzata (solo conteggio, nessun dato)
select count(*) filter (where email is not null and email <> '') as profili_con_email
from public.profiles;

-- ============================================================
-- MODIFICHE CONSIGLIATE (commentate: non eseguite automaticamente)
-- ============================================================
-- Obiettivo: gli utenti autenticati possono leggere i campi pubblici
-- dei soci (nome, nickname, team, nazionalità, avatar, ruolo) ma NON
-- possono modificare i profili altrui; ogni utente modifica solo il
-- proprio. Gli anonimi non devono leggere profiles.
--
-- ATTENZIONE: attivare queste policy senza verificare le query del
-- sito può bloccare qualche pagina (team, classifiche, tornei). Prova
-- prima su un progetto Supabase di test.
--
-- -- Helper SECURITY DEFINER per controllare il ruolo admin senza
-- -- ricorsione delle policy su profiles.
-- create or replace function public.is_club_admin()
-- returns boolean
-- language sql
-- security definer
-- set search_path = public
-- stable
-- as $$
--   select exists (
--     select 1 from public.profiles p
--     where p.id = auth.uid()
--       and (p.is_admin = true or lower(coalesce(p.role, '')) = 'admin')
--   );
-- $$;
-- revoke all on function public.is_club_admin() from public;
-- grant execute on function public.is_club_admin() to authenticated;
--
-- drop policy if exists "profiles_public_select" on public.profiles;
-- drop policy if exists "profiles_update_own" on public.profiles;
-- drop policy if exists "profiles_admin_all" on public.profiles;
--
-- create policy "profiles_public_select" on public.profiles
--   for select to authenticated using (true);
--
-- create policy "profiles_update_own" on public.profiles
--   for update to authenticated
--   using (id = auth.uid())
--   with check (id = auth.uid());
--
-- create policy "profiles_admin_all" on public.profiles
--   for all to authenticated
--   using (public.is_club_admin())
--   with check (public.is_club_admin());
--
-- Nota: la lettura pubblica resta volutamente limitata al ruolo
-- "authenticated" (area membri protetta). Se in futuro vorrai una
-- pagina pubblica degli skipper, crea una vista con sole colonne
-- sicure (nickname, nome, team, nazionalità, avatar) e concedi
-- select sulla vista invece che sulla tabella.
