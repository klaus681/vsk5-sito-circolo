-- ============================================================
-- CVI Virtual – Ban list (email) + stato profilo 'bannato'
-- Esegui UNA VOLTA nel SQL Editor di Supabase.
-- Idempotente.
-- ============================================================

-- 1) Tabella email bannate (blocca anche nuove registrazioni)
create table if not exists public.ban_list (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_norm text generated always as (lower(trim(email))) stored,
  user_id uuid null,
  reason text null,
  banned_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ban_list_email_norm_unique unique (email_norm)
);

create index if not exists ban_list_user_id_idx on public.ban_list (user_id);

alter table public.ban_list enable row level security;

-- Solo admin leggono/scrivono la tabella direttamente
drop policy if exists "ban_list_admin_all" on public.ban_list;
create policy "ban_list_admin_all" on public.ban_list
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) = 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) = 'admin')
    )
  );

-- 2) Controllo email bannata (chiamabile da anon in registrazione)
create or replace function public.is_email_banned(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ban_list b
    where b.email_norm = lower(trim(coalesce(p_email, '')))
      and length(trim(coalesce(p_email, ''))) > 0
  );
$$;

revoke all on function public.is_email_banned(text) from public;
grant execute on function public.is_email_banned(text) to anon, authenticated;

-- 3) is_club_member resta basato su stato = 'attivo'
--    (bannato / sospeso / pending sono già esclusi)
--
-- IMPORTANTE: dopo questo script esegui anche `ban-account-fix-sql.sql`,
-- che aggiunge 'bannato' ai valori ammessi da profiles.stato e blocca
-- lato server le registrazioni con email in ban_list. Senza quel fix
-- il pulsante Ban di Admin → Membri non riesce a salvare lo stato.

comment on table public.ban_list is 'Email bannate: blocco registrazione e login CVI';
comment on function public.is_email_banned(text) is 'True se l''email è in ban_list';
