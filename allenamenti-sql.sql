-- ============================================
-- CVI Virtual – Allenamenti programmati
-- Esegui nel SQL Editor di Supabase.
-- (sicuro da rieseguire: IF NOT EXISTS / DROP POLICY IF EXISTS)
-- ============================================

create table if not exists public.allenamenti (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  titolo text not null,
  descrizione text,
  data_ora timestamptz not null,
  durata_minuti int default 90,

  giorno_settimana int,                    -- 1=Lun ... 7=Dom (ISO)
  ricorrente boolean not null default false,

  classe_barca text,
  max_iscritti int,
  server_info text,
  note text,

  pubblicato boolean not null default true,
  stato text not null default 'programmato'
    check (stato in ('programmato', 'in_corso', 'concluso', 'annullato'))
);

create table if not exists public.allenamento_iscrizioni (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  allenamento_id uuid not null references public.allenamenti(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  nickname text,
  note text,
  unique (allenamento_id, user_id)
);

create index if not exists allenamenti_data_idx on public.allenamenti (data_ora);
create index if not exists allenamenti_pub_idx on public.allenamenti (pubblicato, data_ora);
create index if not exists allenamento_iscrizioni_all_idx on public.allenamento_iscrizioni (allenamento_id);
create index if not exists allenamento_iscrizioni_user_idx on public.allenamento_iscrizioni (user_id);

-- updated_at automatico
create or replace function public.allenamenti_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_allenamenti_updated_at on public.allenamenti;
create trigger trg_allenamenti_updated_at
  before update on public.allenamenti
  for each row execute function public.allenamenti_touch_updated_at();

-- RLS
alter table public.allenamenti enable row level security;
alter table public.allenamento_iscrizioni enable row level security;

-- Soci autenticati vedono solo gli allenamenti pubblicati
drop policy if exists "allenamenti_select_auth" on public.allenamenti;
create policy "allenamenti_select_auth" on public.allenamenti
  for select to authenticated
  using (pubblicato = true);

-- Admin / scorer: lettura completa + scrittura
drop policy if exists "allenamenti_admin_all" on public.allenamenti;
create policy "allenamenti_admin_all" on public.allenamenti
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

-- Iscrizioni: tutti i soci vedono chi è iscritto
drop policy if exists "allenamento_iscrizioni_select" on public.allenamento_iscrizioni;
create policy "allenamento_iscrizioni_select" on public.allenamento_iscrizioni
  for select to authenticated
  using (true);

-- Ogni socio gestisce solo la propria iscrizione
drop policy if exists "allenamento_iscrizioni_insert" on public.allenamento_iscrizioni;
create policy "allenamento_iscrizioni_insert" on public.allenamento_iscrizioni
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "allenamento_iscrizioni_delete" on public.allenamento_iscrizioni;
create policy "allenamento_iscrizioni_delete" on public.allenamento_iscrizioni
  for delete to authenticated
  using (auth.uid() = user_id);

-- Admin possono gestire qualsiasi iscrizione
drop policy if exists "allenamento_iscrizioni_admin" on public.allenamento_iscrizioni;
create policy "allenamento_iscrizioni_admin" on public.allenamento_iscrizioni
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

grant select on public.allenamenti to authenticated;
grant select on public.allenamento_iscrizioni to authenticated;
grant insert, update, delete on public.allenamenti to authenticated;
grant insert, update, delete on public.allenamento_iscrizioni to authenticated;
