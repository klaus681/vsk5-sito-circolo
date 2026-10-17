-- ============================================
-- CVI Virtual – Tornei (campionati / serie)
-- Esegui nel SQL Editor di Supabase.
-- (sicuro da rieseguire: usa IF NOT EXISTS / DROP POLICY IF EXISTS)
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

alter table public.tornei enable row level security;
alter table public.torneo_gare enable row level security;
alter table public.torneo_iscrizioni enable row level security;

drop policy if exists "tornei_public_read" on public.tornei;
create policy "tornei_public_read" on public.tornei
  for select using (true);

drop policy if exists "torneo_gare_public_read" on public.torneo_gare;
create policy "torneo_gare_public_read" on public.torneo_gare
  for select using (true);

drop policy if exists "torneo_iscrizioni_public_read" on public.torneo_iscrizioni;
create policy "torneo_iscrizioni_public_read" on public.torneo_iscrizioni
  for select using (true);

drop policy if exists "tornei_auth_write" on public.tornei;
create policy "tornei_auth_write" on public.tornei
  for all to authenticated using (true) with check (true);

drop policy if exists "torneo_gare_auth_write" on public.torneo_gare;
create policy "torneo_gare_auth_write" on public.torneo_gare
  for all to authenticated using (true) with check (true);

-- Ogni utente autenticato puo iscriversi/disiscriversi solo per se stesso;
-- gli admin gestiscono tutto dal pannello (stessa policy auth write ampia).
drop policy if exists "torneo_iscrizioni_auth_insert" on public.torneo_iscrizioni;
create policy "torneo_iscrizioni_auth_insert" on public.torneo_iscrizioni
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "torneo_iscrizioni_auth_delete" on public.torneo_iscrizioni;
create policy "torneo_iscrizioni_auth_delete" on public.torneo_iscrizioni
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "torneo_iscrizioni_auth_admin" on public.torneo_iscrizioni;
create policy "torneo_iscrizioni_auth_admin" on public.torneo_iscrizioni
  for all to authenticated using (true) with check (true);
