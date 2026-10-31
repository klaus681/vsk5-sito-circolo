-- ============================================================
-- YUMA – contenuti delle due aree, gestiti dal pannello admin
-- Tabella `area_items`: ogni riga è una SCHEDA pubblicata dentro
-- Area Soci (area='soci') o YUMA Only (area='yuma') dal tab "Aree".
-- Idempotente. Esegui DOPO 99-fix-policies.sql e 100-aree-riservate.sql
-- ============================================================

create table if not exists public.area_items (
  id          bigint generated always as identity primary key,
  area        text not null check (area in ('soci', 'yuma')),
  titolo      text not null,
  testo       text,                        -- corpo della scheda, anche multi-riga
  url         text,                        -- link facoltativo: se c'e', la scheda diventa cliccabile
  sort_order  int not null default 0,
  pubblicato  boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);

alter table public.area_items enable row level security;

-- Lettura: Area Soci -> membri approvati; YUMA Only -> is_yuma() (yuma + admin)
drop policy if exists "read area items by area" on public.area_items;
create policy "read area items by area"
  on public.area_items for select
  to authenticated
  using (
    pubblicato
    and (
      (area = 'soci' and public.is_approved_member())
      or public.is_yuma()
    )
  );

-- Scrittura: solo admin
drop policy if exists "admin insert area items" on public.area_items;
create policy "admin insert area items"
  on public.area_items for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admin update area items" on public.area_items;
create policy "admin update area items"
  on public.area_items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin delete area items" on public.area_items;
create policy "admin delete area items"
  on public.area_items for delete
  to authenticated
  using (public.is_admin());

create index if not exists area_items_area_sort_idx
  on public.area_items (area, sort_order, id);

-- ------------------------------------------------------------
-- Contenuti iniziali (solo se la tabella è vuota): così le due aree
-- non nascono spoglie. Da qui in poi si modificano dal tab "Aree".
-- ------------------------------------------------------------
insert into public.area_items (area, titolo, testo, sort_order)
select * from (values
  ('soci', 'Prossimi passi',
   E'• Unisciti al canale Discord del team\n• Partecipa alle regate e agli allenamenti\n• Contatta un admin per qualsiasi dubbio', 1),
  ('soci', 'Area Download',
   'Documenti, foto e materiali del team: qui pubblicheremo i file da scaricare.', 2),
  ('yuma', 'Strumenti del team',
   'Collegamenti rapidi a regate, classifiche e Discord dell''equipaggio.', 1),
  ('yuma', 'Download equipaggio',
   'Regolamenti, skin e materiali interni riservati al team.', 2)
) as v(area, titolo, testo, sort_order)
where not exists (select 1 from public.area_items limit 1);

-- Verifica (opzionale)
-- select id, area, titolo, sort_order, pubblicato from public.area_items order by area, sort_order, id;
