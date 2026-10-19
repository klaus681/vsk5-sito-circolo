-- ============================================================
-- CVI Virtual – Messaggi interni admin -> socio
-- Esegui UNA VOLTA nel SQL Editor di Supabase
-- ============================================================
-- Solo gli admin possono inviare; ogni socio vede esclusivamente
-- i messaggi ricevuti. Il destinatario può segnare come letto
-- (e solo quello: il grant update è limitato a read_at).

create table if not exists public.member_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid references public.profiles(id) on delete set null,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  subject      text not null default '',
  body         text not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

comment on table public.member_messages is
  'Messaggi interni inviati dagli admin ai soci.';

create index if not exists member_messages_recipient_idx
  on public.member_messages (recipient_id, created_at desc);

create index if not exists member_messages_unread_idx
  on public.member_messages (recipient_id)
  where read_at is null;

alter table public.member_messages enable row level security;

-- Grant minimi: update solo sulla colonna read_at.
revoke all on public.member_messages from anon, authenticated;
grant select, insert, delete on public.member_messages to authenticated;
grant update (read_at) on public.member_messages to authenticated;

-- Helper condiviso con member-notes-sql.sql (idempotente).
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

-- Lettura: il destinatario vede i propri messaggi, l'admin vede tutto.
drop policy if exists "member_messages_select" on public.member_messages;
create policy "member_messages_select" on public.member_messages
  for select to authenticated
  using (recipient_id = auth.uid() or public.is_club_admin());

-- Invio: solo admin, e solo a nome proprio.
drop policy if exists "member_messages_insert" on public.member_messages;
create policy "member_messages_insert" on public.member_messages
  for insert to authenticated
  with check (public.is_club_admin() and sender_id = auth.uid());

-- Segna come letto: solo il destinatario (grant limitato a read_at).
drop policy if exists "member_messages_mark_read" on public.member_messages;
create policy "member_messages_mark_read" on public.member_messages
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Eliminazione: destinatario o admin.
drop policy if exists "member_messages_delete" on public.member_messages;
create policy "member_messages_delete" on public.member_messages
  for delete to authenticated
  using (recipient_id = auth.uid() or public.is_club_admin());
