-- ============================================================
-- CVI Virtual – BAN ACCOUNT (script unico, idempotente)
-- Esegui nel SQL Editor di Supabase DOPO:
--   security-rls-hardening-sql.sql
--   membership-audit-sql.sql
-- Crea/aggiorna da solo ban_list: non serve eseguire altro.
-- ============================================================
-- Cosa fa:
--   1. tabella public.ban_list (email bannate) + RLS solo admin
--   2. funzione public.is_email_banned(text) (login/registrazione)
--   3. profiles.stato accetta anche 'bannato'
--      (senza questo punto il pulsante Ban di Admin → Membri fallisce)
--   4. blocco server-side di registrazioni e profili con email bannata
--   5. helper public.is_user_banned(uid)
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0) Prerequisiti
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Tabella public.profiles mancante: esegui prima security-rls-hardening-sql.sql';
  end if;
end $$;

-- ------------------------------------------------------------
-- 1) Tabella email bannate (blocca anche nuove registrazioni)
-- ------------------------------------------------------------
create table if not exists public.ban_list (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_norm text generated always as (lower(trim(email))) stored,
  user_id uuid null,
  reason text null,
  banned_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- installazioni con una ban_list creata a mano senza colonna normalizzata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ban_list' AND column_name = 'email_norm'
  ) THEN
    ALTER TABLE public.ban_list
      ADD COLUMN email_norm text GENERATED ALWAYS AS (lower(trim(email))) STORED;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ban_list_email_norm_unique'
      AND conrelid = 'public.ban_list'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.ban_list
        ADD CONSTRAINT ban_list_email_norm_unique UNIQUE (email_norm);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'ban_list: vincolo unique su email_norm non aggiunto (%). Rimuovi i duplicati e riesegui.', sqlerrm;
    END;
  END IF;
END $$;

create index if not exists ban_list_user_id_idx on public.ban_list (user_id);

alter table public.ban_list enable row level security;

drop policy if exists "ban_list_admin_all" on public.ban_list;
create policy "ban_list_admin_all" on public.ban_list
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) = 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) = 'admin')
    )
  );

-- ------------------------------------------------------------
-- 2) Controllo email bannata (chiamabile da anon in registrazione)
-- ------------------------------------------------------------
create or replace function public.is_email_banned(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ban_list b
    where b.email_norm = lower(trim(coalesce(p_email, '')))
      and length(trim(coalesce(p_email, ''))) > 0
  );
$$;

revoke all on function public.is_email_banned(text) from public;
grant execute on function public.is_email_banned(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 3) Stato profilo: aggiungi 'bannato'
-- ------------------------------------------------------------
-- Rimuove il vecchio vincolo (anche se rinominato) che limita i valori di stato
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%stato%'
      AND pg_get_constraintdef(oid) ILIKE '%pending%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

alter table public.profiles
  add constraint profiles_stato_check
  check (stato in ('pending', 'attivo', 'sospeso', 'bannato'));

comment on column public.profiles.stato is
  'Stato del socio: pending = in attesa di approvazione, attivo = approvato, sospeso = sospeso/congelato, bannato = ban permanente (bloccato anche l''accesso).';

-- ------------------------------------------------------------
-- 4a) Nessuna registrazione con email bannata (trigger su auth.users)
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
-- 4b) Nessun profilo creato con email bannata
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
-- 5) Helper: l'utente indicato è bannato?
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
-- Verifica (facoltativa, sola lettura)
-- ============================================================
select conname, pg_get_constraintdef(oid) as definizione
from pg_constraint
where conname = 'profiles_stato_check'
  and conrelid = 'public.profiles'::regclass;

select tgname, tgrelid::regclass as tabella, tgenabled
from pg_trigger
where not tgisinternal
  and tgname in ('trg_block_banned_signup', 'trg_block_banned_profile');

select email, user_id, reason, created_at
from public.ban_list
order by created_at desc;
