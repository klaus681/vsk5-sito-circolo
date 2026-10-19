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
  note_admin text
);

create table if not exists public.eventi_aperti_risultati (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventi_aperti(id) on delete cascade,
  posizione int not null check (posizione >= 1),
  nickname text not null,
  team text,
  note text,
  unique (evento_id, posizione)
);

create index if not exists eventi_aperti_pub_idx on public.eventi_aperti (pubblicato, mostra_home);
create index if not exists eventi_aperti_data_idx on public.eventi_aperti (data_evento desc nulls last);
create index if not exists eventi_aperti_ris_evento_idx on public.eventi_aperti_risultati (evento_id, posizione);

alter table public.eventi_aperti enable row level security;
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
grant select on public.eventi_aperti_risultati to anon, authenticated;
grant insert, update, delete on public.eventi_aperti to authenticated;
grant insert, update, delete on public.eventi_aperti_risultati to authenticated;
