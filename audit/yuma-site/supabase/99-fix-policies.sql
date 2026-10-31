-- ============================================================
-- YUMA – patch policy mancanti / hardening RLS
-- Idempotente: puo' essere rieseguito senza errori.
-- Esegui in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Da eseguire DOPO schema.sql, members.sql, registration.sql, fix_rls.sql
-- Vedi audit/yuma-site/AUDIT.md (voci P1.1, P1.2, P2.3, P2.6)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Helper: l'utente corrente e' un membro approvato?
--    SECURITY DEFINER: legge public.profiles bypassando la RLS,
--    quindi NON provoca la ricorsione infinita delle policy.
-- ------------------------------------------------------------
create or replace function public.is_approved_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'approved'
  );
$$;

revoke all on function public.is_approved_member() from public;
grant execute on function public.is_approved_member() to authenticated;

-- ------------------------------------------------------------
-- 2) P1.2 – l'Area Membri deve poter elencare l'equipaggio
--    La policy "read own profile" (id = auth.uid() or is_admin())
--    restituiva ai non-admin solo la propria riga: la lista
--    membri mostrava 1 solo nominativo.
--    Questa policy e' permissiva e si somma (OR) alle esistenti:
--    i membri approvati leggono i profili approvati.
-- ------------------------------------------------------------
drop policy if exists "approved members read roster" on public.profiles;
create policy "approved members read roster"
  on public.profiles for select
  to authenticated
  using (status = 'approved' and public.is_approved_member());

-- ------------------------------------------------------------
-- 3) P2.3 – chiude l'escalation di privilegi in fase di signup
--    La vecchia policy permetteva with check (id = auth.uid())
--    senza vincoli su role/status: un utente poteva inserire la
--    propria riga con role='admin', status='approved'.
--    Ora l'auto-inserimento puo' essere solo "pending".
-- ------------------------------------------------------------
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert
  to authenticated
  with check (
    id = auth.uid()
    and status = 'pending'
    and role in ('pending', 'member')
  );

-- ------------------------------------------------------------
-- 4) P1.1 – DELETE candidature da pannello admin
--    app.js:519 deleteCandidatura() falliva sempre: nessuna
--    migrazione definiva una policy FOR DELETE.
-- ------------------------------------------------------------
drop policy if exists "admin delete candidature" on public.candidature;
create policy "admin delete candidature"
  on public.candidature for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------
-- 5) P2.6 – limiti di lunghezza anti-spam sulle candidature
--    NOT VALID: applicato a INSERT/UPDATE nuovi senza far
--    fallire la migrazione su eventuali righe storiche fuori soglia.
--    Per validare anche lo storico:
--      alter table public.candidature validate constraint candidature_lunghezze_check;
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'candidature_lunghezze_check'
      and conrelid = 'public.candidature'::regclass
  ) then
    alter table public.candidature
      add constraint candidature_lunghezze_check check (
        char_length(btrim(nome)) between 2 and 100
        and char_length(btrim(contatto)) between 3 and 200
        and (messaggio is null or char_length(messaggio) <= 2000)
      ) not valid;
  end if;
end $$;

-- Indice per l'ordinamento usato da loadCandidatureList() (order by created_at desc limit 50)
create index if not exists candidature_created_at_idx
  on public.candidature (created_at desc);

-- ------------------------------------------------------------
-- 6) Verifica finale (opzionale, in sola lettura)
--    Elenca le policy attive sulle tabelle coinvolte.
-- ------------------------------------------------------------
-- select tablename, policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('profiles', 'candidature', 'members', 'site_content')
-- order by tablename, cmd, policyname;
