-- ============================================================
-- YUMA – aree riservate: Area Membri / Area YUMA
-- Predispone l'autorizzazione backend delle due aree e della
-- futura Area Download. Idempotente.
-- Esegui DOPO 99-fix-policies.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) Helper: l'utente corrente e' un membro approvato?
--    (se hai gia' eseguito 99-fix-policies.sql esiste gia')
-- ------------------------------------------------------------
create or replace function public.is_approved_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'approved'
  );
$$;

revoke all on function public.is_approved_member() from public;
grant execute on function public.is_approved_member() to authenticated;

-- ------------------------------------------------------------
-- 2) Helper: l'utente corrente e' dell'equipaggio YUMA?
--    Usato dalle policy dell'Area YUMA e, in futuro, dai file
--    riservati al solo equipaggio.
-- ------------------------------------------------------------
create or replace function public.is_yuma()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'approved'
      and p.role in ('yuma', 'admin')
  );
$$;

revoke all on function public.is_yuma() from public;
grant execute on function public.is_yuma() to authenticated;

-- ------------------------------------------------------------
-- 3) AREA DOWNLOAD – schema pronto per il prossimo passo.
--    Al momento e' TUTTO COMMENTATO: scommenta e lancia quando
--    vorrai attivare l'area download.
-- ------------------------------------------------------------
-- create table if not exists public.downloads (
--   id          bigint generated always as identity primary key,
--   titolo      text not null,
--   descrizione text,
--   file_path   text not null,          -- percorso nel bucket Storage
--   area        text not null default 'membri'
--               check (area in ('membri', 'yuma')),
--   sort_order  int not null default 0,
--   created_at  timestamptz not null default now(),
--   created_by  uuid references auth.users(id)
-- );
--
-- alter table public.downloads enable row level security;
--
-- -- Area Membri: leggono i file area='membri'; Area YUMA: legge tutto.
-- create policy "read downloads by area"
--   on public.downloads for select
--   to authenticated
--   using (
--     (area = 'membri' and public.is_approved_member())
--     or public.is_yuma()
--   );
--
-- create policy "admin insert downloads"
--   on public.downloads for insert
--   to authenticated
--   with check (public.is_admin());
--
-- create policy "admin update downloads"
--   on public.downloads for update
--   to authenticated
--   using (public.is_admin())
--   with check (public.is_admin());
--
-- create policy "admin delete downloads"
--   on public.downloads for delete
--   to authenticated
--   using (public.is_admin());
--
-- -- Bucket Storage: gli stessi confini delle due aree.
-- -- create policy "members read member files"
-- --   on storage.objects for select
-- --   to authenticated
-- --   using (bucket_id = 'downloads' and public.is_approved_member());
-- --
-- -- create policy "yuma read crew files"
-- --   on storage.objects for select
-- --   to authenticated
-- --   using (bucket_id = 'downloads-yuma' and public.is_yuma());
