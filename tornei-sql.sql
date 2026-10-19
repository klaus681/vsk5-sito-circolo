-- ============================================
-- CVI Virtual - Tornei (campionati / serie)
-- Esegui nel SQL Editor di Supabase.
-- (sicuro da rieseguire: IF NOT EXISTS / DROP POLICY IF EXISTS)
-- ============================================

create table if not exists public.tornei (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  titolo text not null,
  descrizione text,
  data_inizio date,
  data_fine date,
  scarti int not null default 0,
  stato text not null default 'bozza',
  pubblicato boolean not null default false,
  gare_previste int not null default 0,
  max_partecipanti int
);

-- Colonne extra se la tabella esisteva gia'
alter table public.tornei add column if not exists gare_previste int not null default 0;
alter table public.tornei add column if not exists max_partecipanti int;

create table if not exists public.torneo_gare (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.tornei(id) on delete cascade,
  gara_id uuid not null references public.gare(id) on delete cascade,
  ordine int not null default 0,
  unique (torneo_id, gara_id)
);

create index if not exists torneo_gare_torneo_idx on public.torneo_gare (torneo_id);
create index if not exists torneo_gare_gara_idx on public.torneo_gare (gara_id);

-- Iscrizioni al torneo (indipendenti dalle iscrizioni alle singole gare)
create table if not exists public.torneo_iscrizioni (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  torneo_id uuid not null references public.tornei(id) on delete cascade,
  user_id uuid not null,
  unique (torneo_id, user_id)
);

create index if not exists torneo_iscrizioni_torneo_idx on public.torneo_iscrizioni (torneo_id);
create index if not exists torneo_iscrizioni_user_idx on public.torneo_iscrizioni (user_id);

-- FK user_id -> profiles(id), aggiunta in modo sicuro (NOT VALID = non controlla le righe esistenti)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'torneo_iscrizioni_user_fk') then
    alter table public.torneo_iscrizioni
      add constraint torneo_iscrizioni_user_fk
      foreign key (user_id) references public.profiles(id) on delete cascade not valid;
  end if;
end $$;

-- updated_at automatico
create or replace function public.tornei_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_tornei_updated_at on public.tornei;
create trigger trg_tornei_updated_at
  before update on public.tornei
  for each row execute function public.tornei_touch_updated_at();

alter table public.tornei enable row level security;
alter table public.torneo_gare enable row level security;
alter table public.torneo_iscrizioni enable row level security;

-- Predicato admin/scorer usato dalle policy (ripetuto inline)
-- exists (select 1 from public.profiles p where p.id = auth.uid()
--   and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer')))

-- ---------- LETTURA PUBBLICA ----------
drop policy if exists "tornei_public_read" on public.tornei;
create policy "tornei_public_read" on public.tornei
  for select using (pubblicato = true);

drop policy if exists "torneo_gare_public_read" on public.torneo_gare;
create policy "torneo_gare_public_read" on public.torneo_gare
  for select using (
    exists (select 1 from public.tornei t where t.id = torneo_id and t.pubblicato = true)
  );

drop policy if exists "torneo_iscrizioni_public_read" on public.torneo_iscrizioni;
create policy "torneo_iscrizioni_public_read" on public.torneo_iscrizioni
  for select using (
    exists (select 1 from public.tornei t where t.id = torneo_id and t.pubblicato = true)
  );

-- ---------- ADMIN / SCORER: lettura completa + scrittura ----------
drop policy if exists "tornei_auth_write" on public.tornei;
drop policy if exists "tornei_admin_all" on public.tornei;
create policy "tornei_admin_all" on public.tornei
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))));

drop policy if exists "torneo_gare_auth_write" on public.torneo_gare;
drop policy if exists "torneo_gare_admin_all" on public.torneo_gare;
create policy "torneo_gare_admin_all" on public.torneo_gare
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))));

-- ---------- ISCRIZIONI ----------
-- Ogni utente autenticato gestisce solo la propria iscrizione.
drop policy if exists "torneo_iscrizioni_auth_insert" on public.torneo_iscrizioni;
create policy "torneo_iscrizioni_auth_insert" on public.torneo_iscrizioni
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "torneo_iscrizioni_auth_delete" on public.torneo_iscrizioni;
create policy "torneo_iscrizioni_auth_delete" on public.torneo_iscrizioni
  for delete to authenticated using (auth.uid() = user_id);

-- Admin/scorer gestiscono qualsiasi iscrizione (aggiunta/rimozione dal pannello).
drop policy if exists "torneo_iscrizioni_auth_admin" on public.torneo_iscrizioni;
drop policy if exists "torneo_iscrizioni_admin_all" on public.torneo_iscrizioni;
create policy "torneo_iscrizioni_admin_all" on public.torneo_iscrizioni
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))));

-- ---------- GRANT ----------
grant select on public.tornei to anon, authenticated;
grant select on public.torneo_gare to anon, authenticated;
grant select on public.torneo_iscrizioni to anon, authenticated;
grant insert, update, delete on public.tornei to authenticated;
grant insert, update, delete on public.torneo_gare to authenticated;
grant insert, update, delete on public.torneo_iscrizioni to authenticated;
