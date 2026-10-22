-- ============================================
-- CVI Virtual – Serie Aperte (classifiche professionali per eventi aperti)
-- Completamente separato da gare ufficiali, soci e tornei.
-- Supporta: FIN, DNF, DNS, DSQ, RET + scarti + Low Point
-- Esegui questo SQL nel SQL Editor di Supabase.
-- (sicuro da rieseguire: IF NOT EXISTS / DROP POLICY IF EXISTS)
-- ============================================

-- ---------- SERIE ----------
create table if not exists public.serie_aperte (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  titolo text not null,
  descrizione text,
  data_inizio date,
  data_fine date,
  scarti int not null default 0 check (scarti >= 0 and scarti <= 10),
  pubblicato boolean not null default false,
  mostra_home boolean not null default false,
  note_admin text
);

create index if not exists serie_aperte_pub_idx on public.serie_aperte (pubblicato, mostra_home);
create index if not exists serie_aperte_data_idx on public.serie_aperte (data_inizio desc nulls last);

-- ---------- REGATE DELLA SERIE ----------
create table if not exists public.serie_aperte_regate (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  serie_id uuid not null references public.serie_aperte(id) on delete cascade,
  titolo text not null,
  data_regata timestamptz,
  ordine int not null default 0,
  note text
);

create index if not exists serie_aperte_regate_serie_idx on public.serie_aperte_regate (serie_id, ordine);

-- ---------- RISULTATI ----------
-- stato: FIN | DNF | DNS | DSQ | RET
-- posizione obbligatoria solo se stato = 'FIN'
create table if not exists public.serie_aperte_risultati (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  regata_id uuid not null references public.serie_aperte_regate(id) on delete cascade,
  nickname text not null,
  team text,
  stato text not null default 'FIN'
    check (stato in ('FIN', 'DNF', 'DNS', 'DSQ', 'RET')),
  posizione int check (posizione is null or posizione >= 1),
  note text,
  unique (regata_id, nickname)
);

create index if not exists serie_aperte_ris_regata_idx on public.serie_aperte_risultati (regata_id);
create index if not exists serie_aperte_ris_nick_idx on public.serie_aperte_risultati (nickname);

-- updated_at automatico
create or replace function public.serie_aperte_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_serie_aperte_updated on public.serie_aperte;
create trigger trg_serie_aperte_updated
  before update on public.serie_aperte
  for each row execute function public.serie_aperte_touch_updated_at();

drop trigger if exists trg_serie_aperte_regate_updated on public.serie_aperte_regate;
create trigger trg_serie_aperte_regate_updated
  before update on public.serie_aperte_regate
  for each row execute function public.serie_aperte_touch_updated_at();

drop trigger if exists trg_serie_aperte_ris_updated on public.serie_aperte_risultati;
create trigger trg_serie_aperte_ris_updated
  before update on public.serie_aperte_risultati
  for each row execute function public.serie_aperte_touch_updated_at();

-- ---------- RLS ----------
alter table public.serie_aperte enable row level security;
alter table public.serie_aperte_regate enable row level security;
alter table public.serie_aperte_risultati enable row level security;

-- Lettura pubblica solo se serie pubblicata
drop policy if exists "serie_aperte_select_pub" on public.serie_aperte;
create policy "serie_aperte_select_pub" on public.serie_aperte
  for select using (pubblicato = true);

drop policy if exists "serie_aperte_select_admin" on public.serie_aperte;
create policy "serie_aperte_select_admin" on public.serie_aperte
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
  ));

drop policy if exists "serie_aperte_write_admin" on public.serie_aperte;
create policy "serie_aperte_write_admin" on public.serie_aperte
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

-- Regate
drop policy if exists "serie_regate_select_pub" on public.serie_aperte_regate;
create policy "serie_regate_select_pub" on public.serie_aperte_regate
  for select using (exists (
    select 1 from public.serie_aperte s
    where s.id = serie_id and s.pubblicato = true
  ));

drop policy if exists "serie_regate_select_admin" on public.serie_aperte_regate;
create policy "serie_regate_select_admin" on public.serie_aperte_regate
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
  ));

drop policy if exists "serie_regate_write_admin" on public.serie_aperte_regate;
create policy "serie_regate_write_admin" on public.serie_aperte_regate
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

-- Risultati
drop policy if exists "serie_ris_select_pub" on public.serie_aperte_risultati;
create policy "serie_ris_select_pub" on public.serie_aperte_risultati
  for select using (exists (
    select 1 from public.serie_aperte_regate r
    join public.serie_aperte s on s.id = r.serie_id
    where r.id = regata_id and s.pubblicato = true
  ));

drop policy if exists "serie_ris_select_admin" on public.serie_aperte_risultati;
create policy "serie_ris_select_admin" on public.serie_aperte_risultati
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
  ));

drop policy if exists "serie_ris_write_admin" on public.serie_aperte_risultati;
create policy "serie_ris_write_admin" on public.serie_aperte_risultati
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

-- Grants
grant select on public.serie_aperte to anon, authenticated;
grant select on public.serie_aperte_regate to anon, authenticated;
grant select on public.serie_aperte_risultati to anon, authenticated;

grant insert, update, delete on public.serie_aperte to authenticated;
grant insert, update, delete on public.serie_aperte_regate to authenticated;
grant insert, update, delete on public.serie_aperte_risultati to authenticated;
