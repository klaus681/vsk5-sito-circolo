-- ============================================================
-- CVI Virtual – EVENTI + risultati VSK multi-regata (script unico)
-- Esegui nel SQL Editor di Supabase. Idempotente: puoi rieseguirlo.
-- ============================================================
-- Crea le tabelle eventi_aperti* se non esistono (stesso schema di
-- eventi-aperti-sql.sql) e applica le regole per i log Virtual Skipper:
--   1. eventi_aperti            (evento singolo o con più regate)
--   2. eventi_aperti_regate     (una riga per file/regata)
--   3. eventi_aperti_risultati  (tempi, stati, nickname VSK)
--   4. niente più unique(evento_id, posizione): con più regate la stessa
--      posizione si ripete in ogni regata (prima l'import falliva)
--   5. una regata per file: unique(evento_id, sorgente_file)
--   6. stati ammessi FIN/DNF/DNS/DSQ/RET
--   7. RLS + policy (lettura pubblica se l'evento è pubblicato, scrittura
--      ad admin/scorer) e grant coerenti
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Tabelle
-- ------------------------------------------------------------
create table if not exists public.eventi_aperti (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  titolo text not null,
  data_evento timestamptz,
  descrizione text,
  pubblicato boolean not null default false,
  mostra_home boolean not null default false,
  note_admin text,
  poster text,
  formato text,
  flotta text,
  procedura_partenza text,
  max_iscritti int,
  iscrizioni_apertura timestamptz,
  iscrizioni_chiusura timestamptz,
  proteste_url text,
  sistema_punteggio text default 'low_point',
  scarti int default 0,
  scarti_auto boolean not null default false
);

create table if not exists public.eventi_aperti_regate (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  evento_id uuid not null references public.eventi_aperti(id) on delete cascade,
  titolo text not null,
  data_regata timestamptz,
  ordine int not null default 0,
  sorgente_file text,
  note text
);

create table if not exists public.eventi_aperti_risultati (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventi_aperti(id) on delete cascade,
  regata_id uuid references public.eventi_aperti_regate(id) on delete cascade,
  posizione int check (posizione is null or posizione >= 1),
  nickname text not null,
  nickname_raw text,
  account_vsk text,
  team text,
  note text,
  stato text default 'FIN',
  tempo_ms integer check (tempo_ms is null or tempo_ms >= 0),
  unique (regata_id, nickname)
);

-- colonne VSK mancanti (installazioni create prima di eventi-aperti-sql.sql)
alter table public.eventi_aperti_regate
  add column if not exists sorgente_file text,
  add column if not exists ordine int not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.eventi_aperti_risultati
  add column if not exists regata_id uuid references public.eventi_aperti_regate(id) on delete cascade,
  add column if not exists nickname_raw text,
  add column if not exists account_vsk text,
  add column if not exists team text,
  add column if not exists note text,
  add column if not exists tempo_ms integer,
  add column if not exists stato text default 'FIN';

create index if not exists eventi_aperti_regate_evento_idx
  on public.eventi_aperti_regate (evento_id, ordine);
create index if not exists eventi_aperti_regate_sorgente_idx
  on public.eventi_aperti_regate (evento_id, sorgente_file);
create index if not exists eventi_aperti_ris_evento_idx
  on public.eventi_aperti_risultati (evento_id, posizione);
create index if not exists eventi_ris_regata_idx
  on public.eventi_aperti_risultati (regata_id, posizione);

-- ------------------------------------------------------------
-- 2) Via il vecchio vincolo (evento_id, posizione)
-- ------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.eventi_aperti_risultati'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%evento_id%'
      and pg_get_constraintdef(oid) ilike '%posizione%'
  loop
    execute format(
      'alter table public.eventi_aperti_risultati drop constraint %I',
      c.conname
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3) Una regata per file (dedupe import)
-- ------------------------------------------------------------
create unique index if not exists eventi_regate_evento_file_uidx
  on public.eventi_aperti_regate (evento_id, sorgente_file)
  where sorgente_file is not null;

-- ------------------------------------------------------------
-- 4) Stati ammessi (not valid: non ricontrolla le righe esistenti)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'eventi_ris_stato_check'
      and conrelid = 'public.eventi_aperti_risultati'::regclass
  ) then
    alter table public.eventi_aperti_risultati
      add constraint eventi_ris_stato_check
      check (stato is null or stato in ('FIN', 'DNF', 'DNS', 'DSQ', 'RET'))
      not valid;
  end if;
end $$;

-- ------------------------------------------------------------
-- 5) RLS + policy
-- ------------------------------------------------------------
alter table public.eventi_aperti enable row level security;
alter table public.eventi_aperti_regate enable row level security;
alter table public.eventi_aperti_risultati enable row level security;

drop policy if exists "eventi_aperti_select_pub" on public.eventi_aperti;
create policy "eventi_aperti_select_pub" on public.eventi_aperti
  for select using (pubblicato = true);

drop policy if exists "eventi_aperti_select_admin" on public.eventi_aperti;
create policy "eventi_aperti_select_admin" on public.eventi_aperti
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

drop policy if exists "eventi_aperti_write_admin" on public.eventi_aperti;
create policy "eventi_aperti_write_admin" on public.eventi_aperti
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

drop policy if exists "eventi_regate_select_pub" on public.eventi_aperti_regate;
create policy "eventi_regate_select_pub" on public.eventi_aperti_regate
  for select using (exists (select 1 from public.eventi_aperti e where e.id = evento_id and e.pubblicato = true));

drop policy if exists "eventi_regate_select_admin" on public.eventi_aperti_regate;
create policy "eventi_regate_select_admin" on public.eventi_aperti_regate
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

drop policy if exists "eventi_regate_write_admin" on public.eventi_aperti_regate;
create policy "eventi_regate_write_admin" on public.eventi_aperti_regate
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

drop policy if exists "eventi_ris_select_pub" on public.eventi_aperti_risultati;
create policy "eventi_ris_select_pub" on public.eventi_aperti_risultati
  for select using (exists (select 1 from public.eventi_aperti e where e.id = evento_id and e.pubblicato = true));

drop policy if exists "eventi_ris_select_admin" on public.eventi_aperti_risultati;
create policy "eventi_ris_select_admin" on public.eventi_aperti_risultati
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

drop policy if exists "eventi_ris_write_admin" on public.eventi_aperti_risultati;
create policy "eventi_ris_write_admin" on public.eventi_aperti_risultati
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))));

-- ------------------------------------------------------------
-- 6) Grant
-- ------------------------------------------------------------
grant select on public.eventi_aperti to anon, authenticated;
grant select on public.eventi_aperti_regate to anon, authenticated;
grant select on public.eventi_aperti_risultati to anon, authenticated;
grant insert, update, delete on public.eventi_aperti to authenticated;
grant insert, update, delete on public.eventi_aperti_regate to authenticated;
grant insert, update, delete on public.eventi_aperti_risultati to authenticated;

notify pgrst, 'reload schema';

commit;

-- ============================================================
-- Verifica (sola lettura)
-- ============================================================
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('eventi_aperti', 'eventi_aperti_regate', 'eventi_aperti_risultati')
order by table_name;

select conname, pg_get_constraintdef(oid) as definizione
from pg_constraint
where conrelid = 'public.eventi_aperti_risultati'::regclass
order by conname;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('eventi_aperti_risultati', 'eventi_aperti_regate')
order by tablename, indexname;
