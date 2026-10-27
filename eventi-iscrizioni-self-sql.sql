-- ============================================
-- CVI Virtual - Iscrizione self-service agli eventi
-- Esegui su Supabase SQL Editor (sicuro da rieseguire)
-- ============================================

-- 1) user_id sulle iscrizioni serie
alter table public.serie_aperte_iscrizioni
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists serie_aperte_iscr_user_idx
  on public.serie_aperte_iscrizioni (user_id);

-- 2) Tabella iscrizioni per eventi singoli
create table if not exists public.eventi_aperti_iscrizioni (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  evento_id uuid not null references public.eventi_aperti(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  nickname text not null,
  stato text not null default 'ISC',
  unique (evento_id, nickname)
);

create index if not exists eventi_aperti_iscr_evento_idx
  on public.eventi_aperti_iscrizioni (evento_id);

create index if not exists eventi_aperti_iscr_user_idx
  on public.eventi_aperti_iscrizioni (user_id);

alter table public.eventi_aperti_iscrizioni enable row level security;

-- 3) RLS serie_aperte_iscrizioni
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

drop policy if exists "serie_iscr_insert_self" on public.serie_aperte_iscrizioni;
create policy "serie_iscr_insert_self" on public.serie_aperte_iscrizioni
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(trim(coalesce(p.nickname, ''))) = lower(trim(nickname))
    )
  );

drop policy if exists "serie_iscr_delete_self" on public.serie_aperte_iscrizioni;
create policy "serie_iscr_delete_self" on public.serie_aperte_iscrizioni
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(trim(coalesce(p.nickname, ''))) = lower(trim(nickname))
    )
  );

-- 4) RLS eventi_aperti_iscrizioni
drop policy if exists "ea_iscr_select_pub" on public.eventi_aperti_iscrizioni;
create policy "ea_iscr_select_pub" on public.eventi_aperti_iscrizioni
  for select using (true);

drop policy if exists "ea_iscr_write_admin" on public.eventi_aperti_iscrizioni;
create policy "ea_iscr_write_admin" on public.eventi_aperti_iscrizioni
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

drop policy if exists "ea_iscr_insert_self" on public.eventi_aperti_iscrizioni;
create policy "ea_iscr_insert_self" on public.eventi_aperti_iscrizioni
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(trim(coalesce(p.nickname, ''))) = lower(trim(nickname))
    )
  );

drop policy if exists "ea_iscr_delete_self" on public.eventi_aperti_iscrizioni;
create policy "ea_iscr_delete_self" on public.eventi_aperti_iscrizioni
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(trim(coalesce(p.nickname, ''))) = lower(trim(nickname))
    )
  );

grant select on public.eventi_aperti_iscrizioni to anon, authenticated;
grant insert, update, delete on public.eventi_aperti_iscrizioni to authenticated;
grant select, insert, update, delete on public.serie_aperte_iscrizioni to authenticated;
grant select on public.serie_aperte_iscrizioni to anon;
