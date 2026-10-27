-- CVI Virtual - Locandina / banner per Eventi unificati
-- Aggiunge colonna poster a eventi_aperti e serie_aperte.
-- Idempotente: sicuro da rieseguire.

-- Eventi aperti (singoli)
alter table public.eventi_aperti
  add column if not exists poster text;

-- Serie aperte
alter table public.serie_aperte
  add column if not exists poster text;
