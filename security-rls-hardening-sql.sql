-- ============================================================
-- CVI Virtual – RLS hardening (Sprint 2, punto 1)
-- ------------------------------------------------------------
-- Da eseguire su Supabase → SQL Editor, dopo un backup.
-- Ogni blocco è una transazione separata: se un blocco fallisce,
-- i blocchi precedenti restano applicati e si vede subito dove si ferma.
-- Il trigger finale su auth.users è opzionale e isolato: se fallisce,
-- la sicurezza di profiles/site_settings resta comunque attiva.
--
-- Cosa fa:
--   1. Chiude la lettura anonima di public.profiles (email,
--      role, is_admin erano leggibili con la sola anon key).
--   2. Crea public.profiles_public: vista con sole colonne sicure,
--      usata dalle pagine pubbliche.
--   3. Impedisce l'escalation a admin tramite trigger.
--   4. Crea il profilo automaticamente alla registrazione.
--   5. Nasconde i webhook/segreti di site_settings al client,
--      lasciando leggibili solo le chiavi pubbliche.
--   6. Revoca l'accesso anon alle tabelle riservate.
--
-- Ordine: helper -> vista -> profiles -> site_settings -> revoke -> trigger.
--
-- Dopo questa migrazione:
--   - le pagine pubbliche devono leggere profiles_public;
--   - i webhook restano leggibili solo dagli admin; per spostarli
--     lato server serve una Edge Function (Sprint 2, punto 2).
-- ============================================================

-- ============================================================
-- STEP 1 (blocco 1): Helper ruoli (SECURITY DEFINER per evitare ricorsione RLS)
-- ============================================================
begin;

create or replace function public.is_club_admin()
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
      and (p.is_admin = true or lower(coalesce(p.role, '')) = 'admin')
  );
$$;

revoke all on function public.is_club_admin() from public;
grant execute on function public.is_club_admin() to authenticated;

create or replace function public.is_club_staff()
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
      and (
        p.is_admin = true
        or lower(coalesce(p.role, '')) in ('admin', 'scorer')
      )
  );
$$;

revoke all on function public.is_club_staff() from public;
grant execute on function public.is_club_staff() to authenticated;

commit;

-- ============================================================
-- STEP 2 (blocco 3): Vista pubblica: solo colonne sicure, niente email
-- ============================================================
begin;

-- La vista è di proprietà di postgres e legge la tabella con i
-- privilegi del owner: espone intenzionalmente solo le colonne
-- pubbliche. Non impostare security_invoker=true, altrimenti
-- tornerebbe a applicare la RLS e le pagine pubbliche non
-- vedrebbero più i profili degli altri soci.
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
  is_admin
from public.profiles;

comment on view public.profiles_public is
  'Vista pubblica dei profili: espone solo colonne non sensibili (niente email). Usata dalle pagine pubbliche.';

revoke all on public.profiles_public from public;
revoke all on public.profiles_public from anon;
revoke all on public.profiles_public from authenticated;
grant select on public.profiles_public to anon, authenticated;

commit;

-- ============================================================
-- STEP 3 (blocco 2): Profiles: accesso anonimo chiuso, update solo proprio/admin
-- ============================================================
begin;

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

-- Rimuove tutte le policy esistenti (anche quelle con nomi diversi
-- da quelli documentati), altrimenti una vecchia policy permissiva
-- continuerebbe a valere in OR con le nuove.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', pol.policyname);
  end loop;
end $$;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_admin
  on public.profiles
  for select
  to authenticated
  using (public.is_club_admin());

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (
    id = auth.uid()
    and coalesce(is_admin, false) = false
    and lower(coalesce(role, 'socio')) = 'socio'
  );

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_admin_all
  on public.profiles
  for all
  to authenticated
  using (public.is_club_admin())
  with check (public.is_club_admin());

-- Impedisce a un socio di modificare role/is_admin sul proprio profilo.
-- Gli admin restano liberi di gestire i ruoli; service_role e le
-- migrazioni (auth.uid() nullo) non vengono bloccati.
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
    ) and not public.is_club_admin() then
      raise exception 'Non autorizzato a impostare role/is_admin';
    end if;
  elsif tg_op = 'UPDATE' then
    if (
      new.role is distinct from old.role
      or new.is_admin is distinct from old.is_admin
    ) and not public.is_club_admin() then
      raise exception 'Non autorizzato a modificare role/is_admin';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_privileges on public.profiles;
create trigger trg_profiles_guard_privileges
  before insert or update on public.profiles
  for each row execute function public.profiles_guard_privileges();

commit;

-- ============================================================
-- STEP 4 (blocco 5): Site settings: chiavi pubbliche sì, webhook/segreti no
-- ============================================================
begin;

alter table public.site_settings enable row level security;

revoke all on public.site_settings from anon;
revoke all on public.site_settings from authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'site_settings'
  loop
    execute format('drop policy %I on public.site_settings', pol.policyname);
  end loop;
end $$;

create policy site_settings_public_read
  on public.site_settings
  for select
  to anon, authenticated
  using (
    key not ilike '%webhook%'
    and key not ilike '%secret%'
    and key not ilike '%token%'
    and key not ilike '%password%'
    and key not ilike '%service_role%'
    and key not ilike '%api_key%'
    and key not ilike '%apikey%'
    and key not ilike '%credential%'
  );

create policy site_settings_admin_all
  on public.site_settings
  for all
  to authenticated
  using (public.is_club_admin())
  with check (public.is_club_admin());

commit;

-- ============================================================
-- STEP 5 (blocco 6): Tabelle riservate: nessun accesso anonimo
-- ============================================================
begin;

do $$
declare
  t text;
begin
  foreach t in array array[
    'member_messages',
    'member_notes',
    'proteste',
    'downloads',
    'biblioteca',
    'tutor'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on public.%I from anon', t);
    end if;
  end loop;
end $$;

-- Ricarica la schema cache di PostgREST per rendere subito
-- disponibile public.profiles_public.


-- ============================================================
-- Verifica rapida post-migrazione (eseguire a parte)
-- ============================================================
-- select * from public.profiles_public limit 1;   -- nessuna colonna email
-- select key from public.site_settings;            -- nessuna chiave *webhook*
-- select public.is_club_admin();                   -- false per un socio

commit;

-- ============================================================
-- STEP 6 (blocco 4): Creazione automatica del profilo alla registrazione
-- ============================================================
begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, nome, cognome, nickname, team, email)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'nome', ''), ''),
      coalesce(nullif(new.raw_user_meta_data->>'cognome', ''), ''),
      coalesce(nullif(new.raw_user_meta_data->>'nickname', ''), split_part(new.email, '@', 1)),
      coalesce(nullif(new.raw_user_meta_data->>'team', ''), ''),
      new.email
    )
    on conflict (id) do nothing;
  exception
    when others then
      -- Non bloccare la registrazione se il profilo non può essere creato
      -- (es. nickname duplicato): l'utente potrà completarlo dal profilo.
      raise warning 'handle_new_user: profilo non creato per %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;


notify pgrst, 'reload schema';

-- ============================================================
-- Verifica rapida post-migrazione (eseguire a parte)
-- ============================================================
-- select * from public.profiles_public limit 1;   -- nessuna colonna email
-- select key from public.site_settings;            -- nessuna chiave *webhook*
-- select public.is_club_admin();                   -- false per un socio
