-- ============================================================
-- CVI Virtual – Eventi: risultati VSK multi-regata
-- Esegui UNA VOLTA nel SQL Editor di Supabase, DOPO eventi-aperti-sql.sql.
-- Idempotente: sicuro da rieseguire.
-- ============================================================
-- Cosa fa:
--   1. rimuove il vincolo unique (evento_id, posizione): con più regate la
--      stessa posizione si ripete in ogni regata (prima l'import falliva)
--   2. garantisce le colonne VSK su eventi_aperti_risultati / _regate
--   3. una regata per file: indice unique (evento_id, sorgente_file)
--   4. check sugli stati ammessi (FIN/DNF/DNS/DSQ/RET), non validante sui dati
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Via il vincolo (evento_id, posizione)
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
-- 2) Colonne VSK (per installazioni create prima di eventi-aperti-sql.sql)
-- ------------------------------------------------------------
alter table public.eventi_aperti_risultati
  add column if not exists nickname_raw text,
  add column if not exists account_vsk text,
  add column if not exists tempo_ms integer,
  add column if not exists stato text default 'FIN';

alter table public.eventi_aperti_regate
  add column if not exists sorgente_file text;

create index if not exists eventi_ris_regata_idx
  on public.eventi_aperti_risultati (regata_id, posizione);

-- ------------------------------------------------------------
-- 3) Una regata per file (dedupe import): vale solo con sorgente_file
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

notify pgrst, 'reload schema';

commit;

-- ============================================================
-- Verifica
-- ============================================================
select conname, pg_get_constraintdef(oid) as definizione
from pg_constraint
where conrelid = 'public.eventi_aperti_risultati'::regclass
order by conname;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('eventi_aperti_risultati', 'eventi_aperti_regate')
order by tablename, indexname;
