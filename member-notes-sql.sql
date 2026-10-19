-- ============================================================
-- CVI Virtual – Note interne sui soci (solo admin)
-- Esegui UNA VOLTA nel SQL Editor di Supabase
-- ============================================================
-- Le note NON vengono salvate in public.profiles: stanno in una
-- tabella separata, leggibile/scrivibile solo dagli admin. In questo
-- modo non finiscono mai nel payload dell'elenco soci pubblico.

create table if not exists public.member_notes (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  note       text not null default '',
  updated_by uuid,
  updated_at timestamptz not null default now()
);

comment on table public.member_notes is
  'Note interne dei moderatori sui soci. Accesso riservato agli admin.';

alter table public.member_notes enable row level security;

grant select, insert, update, delete on public.member_notes to authenticated;

-- Helper SECURITY DEFINER: evita la ricorsione delle policy quando una
-- policy deve leggere public.profiles (le policy RLS non si applicano
-- al proprietario della funzione).
create or replace function public.is_club_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role, '')) = 'admin')
  );
$$;

revoke all on function public.is_club_admin() from public;
grant execute on function public.is_club_admin() to authenticated;

-- Policy unica: un admin può leggere/scrivere tutte le note.
drop policy if exists "member_notes_admin_all" on public.member_notes;
create policy "member_notes_admin_all" on public.member_notes
  for all
  to authenticated
  using (public.is_club_admin())
  with check (public.is_club_admin());

-- Nota: se la tabella member_notes non esiste, la pagina membri continua
-- a funzionare e il pulsante "Nota" viene semplicemente nascosto.
