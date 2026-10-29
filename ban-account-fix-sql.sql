-- ============================================================
-- CVI Virtual – FIX ban account (lato soci)
-- Esegui UNA VOLTA nel SQL Editor di Supabase, DOPO ban-list-sql.sql
-- e dopo membership-audit-sql.sql. Idempotente.
-- ============================================================
-- Perché serve:
--   membership-audit-sql.sql crea il vincolo profiles_stato_check con i soli
--   valori ('pending','attivo','sospeso'): senza questo fix l'update a
--   stato = 'bannato' fatto da Admin → Membri fallisce e il ban non viene
--   applicato al profilo.
--
-- Cosa fa:
--   1. profiles.stato accetta anche 'bannato'
--   2. blocco server-side delle registrazioni con email in ban_list
--      (il controllo lato browser non basta: basta chiamare l'API auth)
--   3. blocco server-side della creazione di profili con email in ban_list
--   4. helper public.is_user_banned(uid) per controlli lato DB
-- ============================================================

begin;

-- Prerequisito: ban_list deve esistere (creata da ban-list-sql.sql)
do $$
begin
  if to_regclass('public.ban_list') is null then
    raise exception 'Tabella public.ban_list mancante: esegui prima ban-list-sql.sql';
  end if;
  if to_regclass('public.profiles') is null then
    raise exception 'Tabella public.profiles mancante: esegui prima security-rls-hardening-sql.sql';
  end if;
end $$;

-- ------------------------------------------------------------
-- 1) Stato profilo: aggiungi 'bannato'
-- ------------------------------------------------------------
-- Rimuove il vecchio vincolo (anche se rinominato) che limita i valori di stato
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%stato%'
      and pg_get_constraintdef(oid) ilike '%pending%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_stato_check
  check (stato in ('pending', 'attivo', 'sospeso', 'bannato'));

comment on column public.profiles.stato is
  'Stato del socio: pending = in attesa di approvazione, attivo = approvato, sospeso = sospeso/congelato, bannato = ban permanente (bloccato anche l''accesso).';

-- ------------------------------------------------------------
-- 2) Registrazione: nessun nuovo utente con email bannata
--    (trigger BEFORE INSERT su auth.users: annulla la signUp)
-- ------------------------------------------------------------
create or replace function public.block_banned_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.ban_list b
    where b.email_norm = lower(trim(coalesce(new.email, '')))
      and length(trim(coalesce(new.email, ''))) > 0
  ) then
    raise exception 'Account bannato: registrazione non consentita'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_block_banned_signup on auth.users;
create trigger trg_block_banned_signup
  before insert on auth.users
  for each row execute function public.block_banned_signup();

revoke all on function public.block_banned_signup() from public;

-- ------------------------------------------------------------
-- 3) Profili: nessun profilo creato con email bannata
-- ------------------------------------------------------------
create or replace function public.block_banned_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.ban_list b
    where b.email_norm = lower(trim(coalesce(new.email, '')))
      and length(trim(coalesce(new.email, ''))) > 0
  ) then
    raise exception 'Account bannato: profilo non consentito'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_block_banned_profile on public.profiles;
create trigger trg_block_banned_profile
  before insert on public.profiles
  for each row execute function public.block_banned_profile();

revoke all on function public.block_banned_profile() from public;

-- ------------------------------------------------------------
-- 4) Helper: l'utente indicato è bannato?
--    (stato profilo 'bannato' oppure email presente in ban_list)
-- ------------------------------------------------------------
create or replace function public.is_user_banned(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_uid
      and (
        coalesce(p.stato, 'attivo') = 'bannato'
        or exists (
          select 1
          from public.ban_list b
          where b.email_norm = lower(trim(coalesce(p.email, '')))
            and length(trim(coalesce(p.email, ''))) > 0
        )
      )
  );
$$;

revoke all on function public.is_user_banned(uuid) from public;
grant execute on function public.is_user_banned(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;

-- ============================================================
-- Verifica
-- ============================================================
-- 1) Il vincolo deve includere 'bannato'
select conname, pg_get_constraintdef(oid) as definizione
from pg_constraint
where conname = 'profiles_stato_check'
  and conrelid = 'public.profiles'::regclass;

-- 2) I trigger di blocco devono esistere
select tgname, tgrelid::regclass as tabella, tgenabled
from pg_trigger
where not tgisinternal
  and tgname in ('trg_block_banned_signup', 'trg_block_banned_profile');

-- 3) Elenco email bannate
select email, user_id, reason, created_at
from public.ban_list
order by created_at desc;
