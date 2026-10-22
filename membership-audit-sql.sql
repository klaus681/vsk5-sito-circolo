-- ============================================================
-- CVI Virtual – Priorità 1: approvazione soci, RLS password, audit log
-- Esegui UNA VOLTA nel SQL Editor di Supabase (dopo security-rls-hardening-sql.sql).
-- Idempotente: sicuro da rieseguire.
-- ============================================================
-- Cosa fa:
--   1. aggiunge public.profiles.stato ('pending' | 'attivo' | 'sospeso')
--      - i profili esistenti diventano 'attivo'
--      - i nuovi profili nascono 'pending' (da approvare in Admin → Soci)
--   2. helper public.is_club_member() per la RLS
--   3. limita la lettura di gare_password / torneo_password ai soli soci attivi
--   4. impedisce a un socio di auto-approvarsi o cambiarsi ruolo
--   5. audit_log + trigger su gare, risultati_gara, tornei, torneo_gare, risorse, profiles
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Stato del socio
-- ------------------------------------------------------------
alter table public.profiles add column if not exists stato text;

update public.profiles
   set stato = 'attivo'
 where stato is null or stato = '';

alter table public.profiles alter column stato set default 'pending';
alter table public.profiles alter column stato set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_stato_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_stato_check
      check (stato in ('pending', 'attivo', 'sospeso'));
  end if;
end $$;

comment on column public.profiles.stato is
  'Stato del socio: pending = in attesa di approvazione, attivo = approvato, sospeso = sospeso/espulso.';

-- ------------------------------------------------------------
-- 2) Helper: il richiedente è un socio attivo?
-- ------------------------------------------------------------
create or replace function public.is_club_member()
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
      and coalesce(p.stato, 'attivo') = 'attivo'
  );
$$;

revoke all on function public.is_club_member() from public;
grant execute on function public.is_club_member() to authenticated;

-- ------------------------------------------------------------
-- 3) Password gare/tornei: solo soci attivi (non i pending)
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.gare_password') is not null then
    drop policy if exists "gare_password_auth_read" on public.gare_password;
    create policy "gare_password_auth_read" on public.gare_password
      for select to authenticated
      using (public.is_club_member());
  end if;

  if to_regclass('public.torneo_password') is not null then
    drop policy if exists "torneo_password_auth_read" on public.torneo_password;
    create policy "torneo_password_auth_read" on public.torneo_password
      for select to authenticated
      using (public.is_club_member());
  end if;
end $$;

-- ------------------------------------------------------------
-- 4) Guard profili: nessun auto-ruolo / auto-approvazione
--    (riscrive la funzione di security-rls-hardening-sql.sql)
-- ------------------------------------------------------------
create or replace function public.profiles_guard_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if (
      coalesce(new.is_admin, false) = true
      or lower(coalesce(new.role, 'socio')) <> 'socio'
      or coalesce(new.stato, 'pending') <> 'pending'
    ) and not public.is_club_admin() then
      raise exception 'Non autorizzato a impostare role/is_admin/stato';
    end if;
  elsif tg_op = 'UPDATE' then
    if (
      new.role is distinct from old.role
      or new.is_admin is distinct from old.is_admin
      or new.stato is distinct from old.stato
    ) and not public.is_club_admin() then
      raise exception 'Non autorizzato a modificare role/is_admin/stato';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_privileges on public.profiles;
create trigger trg_profiles_guard_privileges
  before insert or update on public.profiles
  for each row execute function public.profiles_guard_privileges();

-- ------------------------------------------------------------
-- 5) Vista pubblica: aggiungi lo stato (serve alla UI soci)
-- ------------------------------------------------------------
create or replace view public.profiles_public as
select
  id,
  nickname,
  nome,
  cognome,
  team,
  team_id,
  nazionalita,
  avatar_url,
  role,
  is_admin,
  stato
from public.profiles;

revoke all on public.profiles_public from public;
revoke all on public.profiles_public from anon;
revoke all on public.profiles_public from authenticated;
grant select on public.profiles_public to anon, authenticated;

-- ------------------------------------------------------------
-- 6) Audit log
-- ------------------------------------------------------------
create table if not exists public.audit_log (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  actor_id     uuid,
  action       text not null,
  table_name   text not null,
  record_id    text,
  details      jsonb
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_table_idx on public.audit_log (table_name, created_at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from public;
revoke all on public.audit_log from anon;
revoke all on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;

drop policy if exists "audit_admin_read" on public.audit_log;
create policy "audit_admin_read" on public.audit_log
  for select to authenticated
  using (public.is_club_admin());

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old  jsonb;
  v_new  jsonb;
  v_diff jsonb;
  v_id   text;
  v_key  text;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_id  := coalesce(v_old->>'id', v_old->>'key', v_old->>'gara_id', v_old->>'torneo_id');
  else
    v_new := to_jsonb(new);
    v_id  := coalesce(v_new->>'id', v_new->>'key', v_new->>'gara_id', v_new->>'torneo_id');
  end if;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_diff := '{}'::jsonb;
    for v_key in select jsonb_object_keys(v_new)
    loop
      if v_old->v_key is distinct from v_new->v_key then
        v_diff := v_diff || jsonb_build_object(
          v_key,
          jsonb_build_object('old', v_old->v_key, 'new', v_new->v_key)
        );
      end if;
    end loop;
  else
    v_diff := jsonb_build_object('row', coalesce(v_new, v_old));
  end if;

  insert into public.audit_log (actor_id, action, table_name, record_id, details)
  values (auth.uid(), tg_op, tg_table_name, v_id, v_diff);

  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_row_change() from public;

do $$
declare
  t text;
begin
  foreach t in array array['gare', 'risultati_gara', 'tornei', 'torneo_gare', 'risorse']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_audit_%I on public.%I', t, t);
      execute format(
        'create trigger trg_audit_%I after insert or update or delete on public.%I ' ||
        'for each row execute function public.audit_row_change()', t, t
      );
    end if;
  end loop;

  -- profiles: solo modifiche/cancellazioni (evita di registrare i dati di registrazione)
  if to_regclass('public.profiles') is not null then
    execute 'drop trigger if exists trg_audit_profiles on public.profiles';
    execute 'create trigger trg_audit_profiles after update or delete on public.profiles ' ||
            'for each row execute function public.audit_row_change()';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;

-- ============================================================
-- Verifica
-- ============================================================
select
  (select count(*) from public.profiles where stato = 'attivo')  as soci_attivi,
  (select count(*) from public.profiles where stato = 'pending') as soci_in_attesa;

select
  c.relname as tabella,
  c.relrowsecurity as rls_attiva,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'audit_log', 'gare_password', 'torneo_password')
order by c.relname;

select tgname, tgrelid::regclass as tabella
from pg_trigger
where not tgisinternal and tgname like 'trg_audit_%'
order by tabella::text;


