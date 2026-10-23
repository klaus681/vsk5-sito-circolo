-- ============================================
-- CVI Virtual – Serie Aperte: supporto log VSK
-- Aggiunge tempi, account e nickname originali ai risultati,
-- più le opzioni sistema punteggio e scarti automatici alla serie.
--
-- Esegui questo file nel SQL Editor di Supabase DOPO serie-aperte-sql.sql.
-- È sicuro rieseguirlo (IF NOT EXISTS / controlli sui constraint).
-- ============================================

-- ---------- SERIE: sistema punteggio + scarti automatici ----------
alter table public.serie_aperte
  add column if not exists sistema_punteggio text not null default 'low_point';

alter table public.serie_aperte
  add column if not exists scarti_auto boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'serie_aperte_sistema_chk'
  ) then
    alter table public.serie_aperte
      add constraint serie_aperte_sistema_chk
      check (sistema_punteggio in ('low_point', 'high_point'));
  end if;
end $$;

comment on column public.serie_aperte.sistema_punteggio is
  'low_point (1° = 1 pt) oppure high_point (1° = N pt)';
comment on column public.serie_aperte.scarti_auto is
  'true = 1 scarto ogni 4 regate (scarti manuali ignorati)';

-- ---------- REGATE: file VSK di origine (per evitare doppioni) ----------
alter table public.serie_aperte_regate
  add column if not exists sorgente_file text;

create index if not exists serie_aperte_reg_sorgente_idx
  on public.serie_aperte_regate (serie_id, sorgente_file);

-- ---------- RISULTATI: tempo, account, nickname originale ----------
alter table public.serie_aperte_risultati
  add column if not exists tempo_ms integer;

alter table public.serie_aperte_risultati
  add column if not exists account_vsk text;

alter table public.serie_aperte_risultati
  add column if not exists nickname_raw text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'serie_aperte_ris_tempo_chk'
  ) then
    alter table public.serie_aperte_risultati
      add constraint serie_aperte_ris_tempo_chk
      check (tempo_ms is null or tempo_ms >= 0);
  end if;
end $$;

create index if not exists serie_aperte_ris_tempo_idx
  on public.serie_aperte_risultati (regata_id, tempo_ms);

comment on column public.serie_aperte_risultati.tempo_ms is
  'Tempo di arrivo in millisecondi dal log VSK (null = DNF/DNS)';
comment on column public.serie_aperte_risultati.account_vsk is
  'Account VSK (colonna username del log)';
comment on column public.serie_aperte_risultati.nickname_raw is
  'Nickname originale con codici colore Nadeo ($fff, $i, ...)';

-- I permessi (grant) sono già a livello di tabella: valgono anche per le nuove colonne.
-- Le policy RLS restano invariate.
