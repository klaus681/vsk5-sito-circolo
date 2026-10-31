-- ============================================================
-- YUMA – TUTTO L SQL DELLE AREE (99 + 100 + 101 in un unico blocco)
-- Incolla in Supabase -> SQL Editor -> New query -> Run
-- Idempotente: puoi rieseguirlo.
-- ============================================================

-- ============================================================
-- YUMA – policy mancanti, hardening RLS e stato canonico
-- Idempotente: puo' essere rieseguito senza errori.
-- Esegui in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Esegui per ULTIMO: dopo schema.sql, members.sql, registration.sql, fix_rls.sql
-- Questo file e' la fonte di verita' per is_admin() e per le policy.
-- ============================================================

-- ------------------------------------------------------------
-- 0) is_admin() CANONICO
--    schema.sql, registration.sql e fix_rls.sql la ridefiniscono in
--    modo diverso (l'ultimo eseguito vince). Questa versione chiude
--    l'ambiguita': admin = profilo role='admin' con status='approved',
--    oppure l'email amministratrice presente in auth.users.
-- ------------------------------------------------------------
create or replace function public.is_admin()
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
      and p.role = 'admin'
      and p.status = 'approved'
  )
  or exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) = 'klaus68@hotmail.it'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

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

-- ============================================================
-- PARTE 2/3 – helper delle aree (100-aree-riservate.sql)
-- ============================================================
-- ============================================================
-- YUMA – aree riservate: Area Membri / Area YUMA
-- Predispone l'autorizzazione backend delle due aree e della
-- futura Area Download. Idempotente.
-- Esegui DOPO 99-fix-policies.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) Helper: l'utente corrente e' un membro approvato?
--    (se hai gia' eseguito 99-fix-policies.sql esiste gia')
-- ------------------------------------------------------------
create or replace function public.is_approved_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'approved'
  );
$$;

revoke all on function public.is_approved_member() from public;
grant execute on function public.is_approved_member() to authenticated;

-- ------------------------------------------------------------
-- 2) Helper: l'utente corrente e' dell'equipaggio YUMA?
--    Usato dalle policy dell'Area YUMA e, in futuro, dai file
--    riservati al solo equipaggio.
-- ------------------------------------------------------------
create or replace function public.is_yuma()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'approved'
      and p.role in ('yuma', 'admin')
  );
$$;

revoke all on function public.is_yuma() from public;
grant execute on function public.is_yuma() to authenticated;

-- ------------------------------------------------------------
-- 3) AREA DOWNLOAD
--    La tabella e le policy sono in supabase/101-downloads.sql
--    (va eseguito dopo questo file). I contenuti delle due aree
--    si gestiscono dal pannello admin -> tab "Aree".

-- ============================================================
-- PARTE 3/3 – schede delle aree (101-aree-contenuti.sql)
-- ============================================================
-- ============================================================
-- YUMA – contenuti delle due aree, gestiti dal pannello admin
-- Tabella `area_items`: ogni riga è una SCHEDA pubblicata dentro
-- Area Soci (area='soci') o YUMA Only (area='yuma') dal tab "Aree".
-- Idempotente. Esegui DOPO 99-fix-policies.sql e 100-aree-riservate.sql
-- ============================================================

create table if not exists public.area_items (
  id          bigint generated always as identity primary key,
  area        text not null check (area in ('soci', 'yuma')),
  titolo      text not null,
  testo       text,                        -- corpo della scheda, anche multi-riga
  url         text,                        -- link facoltativo: se c'e', la scheda diventa cliccabile
  sort_order  int not null default 0,
  pubblicato  boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);

alter table public.area_items enable row level security;

-- Lettura: Area Soci -> membri approvati; YUMA Only -> is_yuma() (yuma + admin)
drop policy if exists "read area items by area" on public.area_items;
create policy "read area items by area"
  on public.area_items for select
  to authenticated
  using (
    pubblicato
    and (
      (area = 'soci' and public.is_approved_member())
      or public.is_yuma()
    )
  );

-- Scrittura: solo admin
drop policy if exists "admin insert area items" on public.area_items;
create policy "admin insert area items"
  on public.area_items for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admin update area items" on public.area_items;
create policy "admin update area items"
  on public.area_items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin delete area items" on public.area_items;
create policy "admin delete area items"
  on public.area_items for delete
  to authenticated
  using (public.is_admin());

create index if not exists area_items_area_sort_idx
  on public.area_items (area, sort_order, id);

-- ------------------------------------------------------------
-- Contenuti iniziali (solo se la tabella è vuota): così le due aree
-- non nascono spoglie. Da qui in poi si modificano dal tab "Aree".
-- ------------------------------------------------------------
insert into public.area_items (area, titolo, testo, sort_order)
select * from (values
  ('soci', 'Prossimi passi',
   E'• Unisciti al canale Discord del team\n• Partecipa alle regate e agli allenamenti\n• Contatta un admin per qualsiasi dubbio', 1),
  ('soci', 'Area Download',
   'Documenti, foto e materiali del team: qui pubblicheremo i file da scaricare.', 2),
  ('yuma', 'Strumenti del team',
   'Collegamenti rapidi a regate, classifiche e Discord dell''equipaggio.', 1),
  ('yuma', 'Download equipaggio',
   'Regolamenti, skin e materiali interni riservati al team.', 2)
) as v(area, titolo, testo, sort_order)
where not exists (select 1 from public.area_items limit 1);

-- Verifica (opzionale)
-- select id, area, titolo, sort_order, pubblicato from public.area_items order by area, sort_order, id;
