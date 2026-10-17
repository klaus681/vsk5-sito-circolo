-- CVI Virtual – Indice del Regolamento gestibile dall'admin
-- Una riga = una voce dell'indice + la relativa sezione (accordion) nella pagina Regolamento.
-- Se la tabella è vuota, la pagina regolamento.html mostra l'elenco statico predefinito (fallback).

create table if not exists public.regolamento_regole (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ordine integer not null default 0,
  -- 'rule1'..'rule11' per le regole integrate: mantengono le traduzioni i18n della pagina.
  -- NULL per le regole nuove create dall'admin (solo italiano).
  chiave text,
  titolo text not null default '',
  contenuto text,
  visibile boolean not null default true
);

create index if not exists regolamento_regole_ordine_idx on public.regolamento_regole (ordine, visibile);

alter table public.regolamento_regole enable row level security;

-- Lettura pubblica: solo le voci visibili
drop policy if exists "regolamento_select_pub" on public.regolamento_regole;
create policy "regolamento_select_pub" on public.regolamento_regole
  for select using (visibile = true);

-- Lettura completa per admin/scorer
drop policy if exists "regolamento_select_admin" on public.regolamento_regole;
create policy "regolamento_select_admin" on public.regolamento_regole
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

-- Scrittura riservata ad admin/scorer
drop policy if exists "regolamento_write_admin" on public.regolamento_regole;
create policy "regolamento_write_admin" on public.regolamento_regole
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

grant select on public.regolamento_regole to anon, authenticated;
grant all on public.regolamento_regole to authenticated;
