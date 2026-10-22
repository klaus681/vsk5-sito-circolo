-- ============================================================
-- CVI Virtual – Gating soci approvati (contenuti e azioni riservate)
-- Esegui UNA VOLTA nel SQL Editor di Supabase, dopo membership-audit-sql.sql.
-- Idempotente: sicuro da rieseguire.
-- ============================================================
-- Un account 'pending' (o 'sospeso') deve poter leggere solo i contenuti
-- pubblici. Questa migrazione estende public.is_club_member() a:
--   - risorse e relativi file su Storage
--   - vecchie tabelle downloads / biblioteca
--   - tutor (resta visibile la propria candidatura)
--   - iscrizioni a gare, tornei, allenamenti e invio proteste
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Risorse: i pending vedono solo i contenuti pubblici
-- ------------------------------------------------------------
drop policy if exists "risorse_auth_read" on public.risorse;
create policy "risorse_auth_read" on public.risorse
  for select to authenticated
  using (
    (pubblicato = true and (visibilita = 'pubblico' or public.is_club_member()))
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
    )
  );

-- ------------------------------------------------------------
-- 2) Storage risorse: soci attivi, oppure file di risorse pubbliche
-- ------------------------------------------------------------
drop policy if exists "risorse_storage_read" on storage.objects;
create policy "risorse_storage_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'risorse' and (
      public.is_club_member()
      or exists (
        select 1 from public.risorse r
        where r.pubblicato = true
          and r.visibilita = 'pubblico'
          and r.bucket = 'risorse'
          and r.private_path = name
      )
    )
  );

-- ------------------------------------------------------------
-- 3) Vecchie tabelle downloads / biblioteca
-- ------------------------------------------------------------
drop policy if exists "downloads_auth_write" on public.downloads;
create policy "downloads_auth_write" on public.downloads
  for all to authenticated
  using (public.is_club_member())
  with check (public.is_club_member());

drop policy if exists "biblioteca_select_auth" on public.biblioteca;
create policy "biblioteca_select_auth" on public.biblioteca
  for select to authenticated
  using (
    (pubblicato = true and public.is_club_member())
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
    )
  );

-- ------------------------------------------------------------
-- 4) Tutor: contenuti ai soci attivi, propria candidatura sempre visibile
-- ------------------------------------------------------------
drop policy if exists "tutor_select_auth" on public.tutor;
create policy "tutor_select_auth" on public.tutor
  for select to authenticated
  using (
    user_id = auth.uid()
    or (public.is_club_member() and stato = 'approvato')
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
    )
  );

-- ------------------------------------------------------------
-- 5) Azioni riservate ai soci attivi
--    Policy RESTRICTIVE: si sommano (AND) alle policy esistenti,
--    quindi non serve conoscere i loro nomi.
-- ------------------------------------------------------------
drop policy if exists "iscrizioni_gare_active_insert" on public.iscrizioni_gare;
create policy "iscrizioni_gare_active_insert" on public.iscrizioni_gare
  as restrictive for insert to authenticated
  with check (public.is_club_member());

drop policy if exists "iscrizioni_gare_active_delete" on public.iscrizioni_gare;
create policy "iscrizioni_gare_active_delete" on public.iscrizioni_gare
  as restrictive for delete to authenticated
  using (public.is_club_member());

drop policy if exists "torneo_iscrizioni_active_insert" on public.torneo_iscrizioni;
create policy "torneo_iscrizioni_active_insert" on public.torneo_iscrizioni
  as restrictive for insert to authenticated
  with check (public.is_club_member());

drop policy if exists "torneo_iscrizioni_active_delete" on public.torneo_iscrizioni;
create policy "torneo_iscrizioni_active_delete" on public.torneo_iscrizioni
  as restrictive for delete to authenticated
  using (public.is_club_member());

drop policy if exists "allenamento_iscrizioni_active_insert" on public.allenamento_iscrizioni;
create policy "allenamento_iscrizioni_active_insert" on public.allenamento_iscrizioni
  as restrictive for insert to authenticated
  with check (public.is_club_member());

drop policy if exists "allenamento_iscrizioni_active_delete" on public.allenamento_iscrizioni;
create policy "allenamento_iscrizioni_active_delete" on public.allenamento_iscrizioni
  as restrictive for delete to authenticated
  using (public.is_club_member());

drop policy if exists "proteste_active_insert" on public.proteste;
create policy "proteste_active_insert" on public.proteste
  as restrictive for insert to authenticated
  with check (public.is_club_member());

notify pgrst, 'reload schema';

commit;

-- ============================================================
-- Verifica
-- ============================================================
select tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('risorse', 'downloads', 'biblioteca', 'tutor',
                    'iscrizioni_gare', 'torneo_iscrizioni',
                    'allenamento_iscrizioni', 'proteste')
order by tablename, policyname;

select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname = 'risorse_storage_read';

