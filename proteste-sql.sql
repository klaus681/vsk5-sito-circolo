-- ============================================
-- CVI Virtual – tabella proteste di regata
-- Esegui questo SQL nel SQL Editor di Supabase
-- ============================================

create table if not exists public.proteste (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  protestante_id uuid not null references auth.users(id) on delete cascade,
  protestante_nick text,
  gara_id uuid references public.gare(id) on delete set null,
  gara_titolo text,
  protestato_nick text not null,
  regola text,
  descrizione text not null,
  momento text,
  testimoni text,
  allegati_url text,
  status text not null default 'pending'
    check (status in ('pending', 'in_esame', 'accolta', 'respinta', 'ritirata')),
  admin_note text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists proteste_protestante_idx on public.proteste (protestante_id);
create index if not exists proteste_status_idx on public.proteste (status);
create index if not exists proteste_created_idx on public.proteste (created_at desc);

alter table public.proteste enable row level security;

drop policy if exists "proteste_insert_own" on public.proteste;
create policy "proteste_insert_own" on public.proteste
  for insert to authenticated
  with check (auth.uid() = protestante_id);

drop policy if exists "proteste_select_own" on public.proteste;
create policy "proteste_select_own" on public.proteste
  for select to authenticated
  using (auth.uid() = protestante_id);

drop policy if exists "proteste_update_own_pending" on public.proteste;
create policy "proteste_update_own_pending" on public.proteste
  for update to authenticated
  using (auth.uid() = protestante_id and status = 'pending')
  with check (auth.uid() = protestante_id);

drop policy if exists "proteste_admin_select" on public.proteste;
create policy "proteste_admin_select" on public.proteste
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.is_admin = true
          or lower(coalesce(p.role, '')) in ('admin', 'scorer')
        )
    )
  );

drop policy if exists "proteste_admin_update" on public.proteste;
create policy "proteste_admin_update" on public.proteste
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.is_admin = true
          or lower(coalesce(p.role, '')) in ('admin', 'scorer')
        )
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.is_admin = true
          or lower(coalesce(p.role, '')) in ('admin', 'scorer')
        )
    )
  );

grant select, insert, update on public.proteste to authenticated;
