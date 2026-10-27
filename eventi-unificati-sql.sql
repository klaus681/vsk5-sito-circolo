-- ============================================
-- CVI Virtual - Area Eventi unificata
-- Script semplificato, sicuro da rieseguire.
-- Consiglio: esegui un BLOCCO alla volta nel SQL Editor di Supabase.
-- ============================================

-- ============================================
-- BLOCCO 1 - Campi su serie_aperte
-- ============================================
alter table public.serie_aperte add column if not exists tipo_evento text default 'campionato';
alter table public.serie_aperte add column if not exists formato text;
alter table public.serie_aperte add column if not exists flotta text;
alter table public.serie_aperte add column if not exists procedura_partenza text;
alter table public.serie_aperte add column if not exists max_iscritti integer;
alter table public.serie_aperte add column if not exists iscrizioni_apertura timestamptz;
alter table public.serie_aperte add column if not exists iscrizioni_chiusura timestamptz;
alter table public.serie_aperte add column if not exists proteste_url text;

-- ============================================
-- BLOCCO 2 - Campi su eventi_aperti
-- ============================================
alter table public.eventi_aperti add column if not exists formato text;
alter table public.eventi_aperti add column if not exists flotta text;
alter table public.eventi_aperti add column if not exists procedura_partenza text;
alter table public.eventi_aperti add column if not exists max_iscritti integer;
alter table public.eventi_aperti add column if not exists iscrizioni_apertura timestamptz;
alter table public.eventi_aperti add column if not exists iscrizioni_chiusura timestamptz;
alter table public.eventi_aperti add column if not exists proteste_url text;

-- ============================================
-- BLOCCO 3 - Tabelle gironi e iscrizioni
-- ============================================
create table if not exists public.serie_aperte_gironi (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  serie_id uuid not null references public.serie_aperte(id) on delete cascade,
  nome text not null,
  ordine int not null default 0,
  unique (serie_id, nome)
);

create index if not exists serie_aperte_gironi_serie_idx
  on public.serie_aperte_gironi (serie_id, ordine);

create table if not exists public.serie_aperte_iscrizioni (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  serie_id uuid not null references public.serie_aperte(id) on delete cascade,
  girone_id uuid references public.serie_aperte_gironi(id) on delete set null,
  nickname text not null,
  stato text not null default 'ISC',
  unique (serie_id, nickname)
);

create index if not exists serie_aperte_iscr_serie_idx
  on public.serie_aperte_iscrizioni (serie_id, girone_id);

-- ============================================
-- BLOCCO 4 - Giornata e girone sulle regate
-- ============================================
alter table public.serie_aperte_regate add column if not exists giornata integer;
alter table public.serie_aperte_regate add column if not exists girone_id uuid;

create index if not exists serie_aperte_regate_giornata_idx
  on public.serie_aperte_regate (serie_id, giornata, ordine);

-- ============================================
-- BLOCCO 5 - Permessi e sicurezza (RLS)
-- ============================================
alter table public.serie_aperte_gironi enable row level security;
alter table public.serie_aperte_iscrizioni enable row level security;

drop policy if exists "serie_gironi_select_pub" on public.serie_aperte_gironi;
create policy "serie_gironi_select_pub" on public.serie_aperte_gironi
  for select using (true);

drop policy if exists "serie_gironi_write_admin" on public.serie_aperte_gironi;
create policy "serie_gironi_write_admin" on public.serie_aperte_gironi
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
  ));

drop policy if exists "serie_iscr_select_pub" on public.serie_aperte_iscrizioni;
create policy "serie_iscr_select_pub" on public.serie_aperte_iscrizioni
  for select using (true);

drop policy if exists "serie_iscr_write_admin" on public.serie_aperte_iscrizioni;
create policy "serie_iscr_write_admin" on public.serie_aperte_iscrizioni
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
  ));

grant select on public.serie_aperte_gironi to anon, authenticated;
grant select on public.serie_aperte_iscrizioni to anon, authenticated;
grant insert, update, delete on public.serie_aperte_gironi to authenticated;
grant insert, update, delete on public.serie_aperte_iscrizioni to authenticated;
