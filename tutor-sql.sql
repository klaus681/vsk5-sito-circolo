-- ============================================
-- CVI Virtual – Tutor (mentorship)
-- Esegui nel SQL Editor di Supabase.
-- Materie: regole, tecnica, partenza, setup, altro
-- ============================================

create table if not exists public.tutor (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  user_id uuid not null references public.profiles(id) on delete cascade,
  bio text,
  -- materie: array di codici
  materie text[] not null default '{}',
  disponibilita_note text,
  max_allievi int default 3,

  -- candidatura / moderazione admin
  stato text not null default 'in_attesa'
    check (stato in ('in_attesa', 'approvato', 'rifiutato', 'sospeso')),
  disponibile boolean not null default true,

  note_admin text,

  unique (user_id)
);

create table if not exists public.tutor_sessioni (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  tutor_id uuid not null references public.tutor(id) on delete cascade,
  tutor_user_id uuid not null references public.profiles(id) on delete cascade,
  allievo_id uuid not null references public.profiles(id) on delete cascade,

  materia text not null
    check (materia in ('regole', 'tecnica', 'partenza', 'setup', 'altro')),
  data_ora timestamptz,
  durata_minuti int default 60,
  messaggio_allievo text,
  nota_tutor text,

  stato text not null default 'in_attesa'
    check (stato in ('in_attesa', 'accettata', 'rifiutata', 'annullata', 'conclusa'))
);

create index if not exists tutor_stato_idx on public.tutor (stato, disponibile);
create index if not exists tutor_user_idx on public.tutor (user_id);
create index if not exists tutor_sessioni_tutor_idx on public.tutor_sessioni (tutor_id);
create index if not exists tutor_sessioni_allievo_idx on public.tutor_sessioni (allievo_id);
create index if not exists tutor_sessioni_stato_idx on public.tutor_sessioni (stato);

create or replace function public.tutor_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_tutor_updated_at on public.tutor;
create trigger trg_tutor_updated_at
  before update on public.tutor
  for each row execute function public.tutor_touch_updated_at();

drop trigger if exists trg_tutor_sessioni_updated_at on public.tutor_sessioni;
create trigger trg_tutor_sessioni_updated_at
  before update on public.tutor_sessioni
  for each row execute function public.tutor_touch_updated_at();

alter table public.tutor enable row level security;
alter table public.tutor_sessioni enable row level security;

-- Helper: is admin
-- SELECT tutor approvati: tutti i soci autenticati
drop policy if exists "tutor_select_auth" on public.tutor;
create policy "tutor_select_auth" on public.tutor
  for select to authenticated
  using (
    stato = 'approvato'
    or user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
    )
  );

-- Insert candidatura: solo se stesso user_id
drop policy if exists "tutor_insert_own" on public.tutor;
create policy "tutor_insert_own" on public.tutor
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Update proprio record (bio, materie, disponibilità) se non sospeso da admin in modi strani
-- Soci possono aggiornare il proprio; admin tutti
drop policy if exists "tutor_update_own" on public.tutor;
create policy "tutor_update_own" on public.tutor
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
    )
  );

drop policy if exists "tutor_admin_all" on public.tutor;
create policy "tutor_admin_all" on public.tutor
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
  ));

-- Sessioni: partecipanti + admin
drop policy if exists "tutor_sessioni_select" on public.tutor_sessioni;
create policy "tutor_sessioni_select" on public.tutor_sessioni
  for select to authenticated
  using (
    allievo_id = auth.uid()
    or tutor_user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
    )
  );

drop policy if exists "tutor_sessioni_insert" on public.tutor_sessioni;
create policy "tutor_sessioni_insert" on public.tutor_sessioni
  for insert to authenticated
  with check (auth.uid() = allievo_id);

drop policy if exists "tutor_sessioni_update" on public.tutor_sessioni;
create policy "tutor_sessioni_update" on public.tutor_sessioni
  for update to authenticated
  using (
    allievo_id = auth.uid()
    or tutor_user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
    )
  )
  with check (
    allievo_id = auth.uid()
    or tutor_user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
    )
  );

drop policy if exists "tutor_sessioni_admin" on public.tutor_sessioni;
create policy "tutor_sessioni_admin" on public.tutor_sessioni
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
  ));

grant select, insert, update on public.tutor to authenticated;
grant select, insert, update on public.tutor_sessioni to authenticated;
grant delete on public.tutor to authenticated;
grant delete on public.tutor_sessioni to authenticated;
