-- CVI Virtual – Eventi aperti / classifiche manuali
-- Non tocca gare ufficiali, risultati_gara, classifiche soci

create table if not exists public.eventi_aperti (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  titolo text not null,
  data_evento timestamptz,
  descrizione text,
  pubblicato boolean not null default false,
  mostra_home boolean not null default false,
  note_admin text,
  poster text,
  formato text,
  flotta text,
  procedura_partenza text,
  max_iscritti int,
  iscrizioni_apertura timestamptz,
  iscrizioni_chiusura timestamptz,
  proteste_url text,
  sistema_punteggio text default 'low_point',
  scarti int default 0,
  scarti_auto boolean not null default false
);

create table if not exists public.eventi_aperti_regate (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  evento_id uuid not null references public.eventi_aperti(id) on delete cascade,
  titolo text not null,
  data_regata timestamptz,
  ordine int not null default 0,
  sorgente_file text,
  note text
);

create index if not exists eventi_aperti_regate_evento_idx
  on public.eventi_aperti_regate (evento_id, ordine);
create index if not exists eventi_aperti_regate_sorgente_idx
  on public.eventi_aperti_regate (evento_id, sorgente_file);

create table if not exists public.eventi_aperti_risultati (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventi_aperti(id) on delete cascade,
  regata_id uuid references public.eventi_aperti_regate(id) on delete cascade,
  posizione int check (posizione >= 1),
  nickname text not null,
  nickname_raw text,
  account_vsk text,
  team text,
  note text,
  stato text default 'FIN',
  tempo_ms int,
  unique (regata_id, nickname),
  unique (evento_id, posizione)
);

create index if not exists eventi_aperti_ris_evento_idx on public.eventi_aperti_risultati (evento_id, posizione);
create index if not exists eventi_aperti_ris_regata_idx on public.eventi_aperti_risultati (regata_id, nickname);

alter table public.eventi_aperti enable row level security;
alter table public.eventi_aperti_regate enable row level security;
alter table public.eventi_aperti_risultati enable row level security;

drop policy if exists "eventi_aperti_select_pub" on public.eventi_aperti;
create policy "eventi_aperti_select_pub" on public.eventi_aperti
  for select using (pubblicato = true);

drop policy if exists "eventi_aperti_select_admin" on public.eventi_aperti;
create policy "eventi_aperti_select_admin" on public.eventi_aperti
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

drop policy if exists "eventi_aperti_write_admin" on public.eventi_aperti;
create policy "eventi_aperti_write_admin" on public.eventi_aperti
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

drop policy if exists "eventi_regate_select_pub" on public.eventi_aperti_regate;
create policy "eventi_regate_select_pub" on public.eventi_aperti_regate
  for select using (exists (select 1 from public.eventi_aperti e where e.id = evento_id and e.pubblicato = true));

drop policy if exists "eventi_regate_select_admin" on public.eventi_aperti_regate;
create policy "eventi_regate_select_admin" on public.eventi_aperti_regate
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

drop policy if exists "eventi_regate_write_admin" on public.eventi_aperti_regate;
create policy "eventi_regate_write_admin" on public.eventi_aperti_regate
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

drop policy if exists "eventi_ris_select_pub" on public.eventi_aperti_risultati;
create policy "eventi_ris_select_pub" on public.eventi_aperti_risultati
  for select using (exists (select 1 from public.eventi_aperti e where e.id = evento_id and e.pubblicato = true));

drop policy if exists "eventi_ris_select_admin" on public.eventi_aperti_risultati;
create policy "eventi_ris_select_admin" on public.eventi_aperti_risultati
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

drop policy if exists "eventi_ris_write_admin" on public.eventi_aperti_risultati;
create policy "eventi_ris_write_admin" on public.eventi_aperti_risultati
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

grant select on public.eventi_aperti to anon, authenticated;
grant select on public.eventi_aperti_regate to anon, authenticated;
grant select on public.eventi_aperti_risultati to anon, authenticated;
grant insert, update, delete on public.eventi_aperti to authenticated;
grant insert, update, delete on public.eventi_aperti_regate to authenticated;
grant insert, update, delete on public.eventi_aperti_risultati to authenticated;
