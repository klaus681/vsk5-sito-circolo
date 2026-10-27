-- CVI Virtual – Locandina / banner per Eventi unificati
-- Aggiunge colonna poster (URL o path storage) a eventi_aperti e serie_aperte.
-- Idempotente: sicuro da rieseguire.

-- Eventi aperti (singoli)
alter table public.eventi_aperti
  add column if not exists poster text;

comment on column public.eventi_aperti.poster is
  'URL o path della locandina/banner mostrata in lista Eventi e in Home';

-- Serie aperte
alter table public.serie_aperte
  add column if not exists poster text;

comment on column public.serie_aperte.poster is
  'URL o path della locandina/banner mostrata in lista Eventi e in Home';
