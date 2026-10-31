-- ============================================================
-- YUMA – contenuti delle due aree, gestiti dal pannello admin
-- Tabella `downloads`: voci/link/file pubblicati dall'admin in
-- Area Soci (area='soci') e in YUMA Only (area='yuma').
-- Idempotente. Esegui DOPO 99-fix-policies.sql e 100-aree-riservate.sql
-- ============================================================

create table if not exists public.downloads (
  id          bigint generated always as identity primary key,
  titolo      text not null,
  descrizione text,
  url         text,                        -- link diretto (Drive, Discord, PDF, ...)
  file_path   text,                        -- percorso nel bucket Storage (futuro upload)
  area        text not null default 'soci'
              check (area in ('soci', 'yuma')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);

alter table public.downloads enable row level security;

-- Lettura: Area Soci -> membri approvati; YUMA Only -> is_yuma() (yuma + admin)
drop policy if exists "read downloads by area" on public.downloads;
create policy "read downloads by area"
  on public.downloads for select
  to authenticated
  using (
    (area = 'soci' and public.is_approved_member())
    or public.is_yuma()
  );

-- Scrittura: solo admin
drop policy if exists "admin insert downloads" on public.downloads;
create policy "admin insert downloads"
  on public.downloads for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admin update downloads" on public.downloads;
create policy "admin update downloads"
  on public.downloads for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin delete downloads" on public.downloads;
create policy "admin delete downloads"
  on public.downloads for delete
  to authenticated
  using (public.is_admin());

create index if not exists downloads_area_sort_idx
  on public.downloads (area, sort_order, id);

-- Verifica (opzionale)
-- select id, area, titolo, url, sort_order from public.downloads order by area, sort_order, id;
