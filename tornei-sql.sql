-- ============================================
-- CVI Virtual – Tornei (campionati / serie)
-- Esegui nel SQL Editor di Supabase.
-- ============================================

create table if not exists public.tornei (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  titolo text not null,
  descrizione text,
  data_inizio date,
  data_fine date,
  -- quanti punteggi peggiori scartare (Low Point: scarta i punti piu alti)
  scarti int not null default 0,
  -- bozza | aperto | in_corso | chiuso
  stato text not null default 'bozza',
  -- visibile sulla pagina pubblica
  pubblicato boolean not null default false
);

create table if not exists public.torneo_gare (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.tornei(id) on delete cascade,
  gara_id uuid not null references public.gare(id) on delete cascade,
  ordine int not null default 0,
  unique (torneo_id, gara_id)
);

create index if not exists torneo_gare_torneo_idx on public.torneo_gare (torneo_id);
create index if not exists torneo_gare_gara_idx on public.torneo_gare (gara_id);

alter table public.tornei enable row level security;
alter table public.torneo_gare enable row level security;

-- Lettura pubblica (pagina Tornei)
drop policy if exists "tornei_public_read" on public.tornei;
create policy "tornei_public_read" on public.tornei
  for select using (true);

drop policy if exists "torneo_gare_public_read" on public.torneo_gare;
create policy "torneo_gare_public_read" on public.torneo_gare
  for select using (true);

-- Scrittura autenticati (il pannello admin e gia protetto lato app)
drop policy if exists "tornei_auth_write" on public.tornei;
create policy "tornei_auth_write" on public.tornei
  for all to authenticated using (true) with check (true);

drop policy if exists "torneo_gare_auth_write" on public.torneo_gare;
create policy "torneo_gare_auth_write" on public.torneo_gare
  for all to authenticated using (true) with check (true);
