-- ============================================
-- CVI Virtual – Password server per gara
-- Esegui UNA VOLTA nel SQL Editor di Supabase.
-- Sicuro da rieseguire (create if not exists / drop policy if exists).
-- ============================================
-- La password è un testo libero inserito dall'admin per comunicare
-- ai soci la password del server Virtual Skipper. Non è una credenziale
-- di autenticazione: serve solo a informare i soci iscritti/loggati.
--
-- È salvata in una tabella separata perché public.gare è leggibile
-- anche in anonimo: così la password viene restituita solo agli utenti
-- autenticati (policy select to authenticated) e mai ai visitatori.

create table if not exists public.gare_password (
  gara_id    uuid primary key references public.gare(id) on delete cascade,
  password   text not null default '',
  updated_at timestamptz not null default now()
);

comment on table public.gare_password is
  'Password del server comunicata ai soci per una gara. Visibile solo agli utenti autenticati.';

create or replace function public.gare_password_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_gare_password_updated_at on public.gare_password;
create trigger trg_gare_password_updated_at
  before update on public.gare_password
  for each row execute function public.gare_password_touch_updated_at();

alter table public.gare_password enable row level security;

-- Nessun accesso anonimo: solo utenti loggati.
revoke all on public.gare_password from public;
revoke all on public.gare_password from anon;
revoke all on public.gare_password from authenticated;
grant select, insert, update, delete on public.gare_password to authenticated;

-- Lettura: qualsiasi socio loggato (socio, caposquadra, scorer, admin).
drop policy if exists "gare_password_auth_read" on public.gare_password;
create policy "gare_password_auth_read" on public.gare_password
  for select to authenticated
  using (true);

-- Scrittura: admin/scorer (stesso predicato usato da tornei-sql.sql).
drop policy if exists "gare_password_admin_all" on public.gare_password;
create policy "gare_password_admin_all" on public.gare_password
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))));

notify pgrst, 'reload schema';

-- ============================================
-- Verifica (deve restituire 1 riga: rls = true, policies = 2)
-- ============================================
select
  c.relname                       as tabella,
  c.relrowsecurity                as rls_attiva,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'gare_password') as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'gare_password';

-- Se la verifica restituisce 0 righe la tabella non è stata creata:
-- ricontrolla di aver eseguito lo script sul progetto Supabase giusto.
