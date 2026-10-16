-- CVI Virtual – nazionalità opzionale sul profilo
-- Esegui UNA VOLTA nel SQL Editor di Supabase

alter table public.profiles
  add column if not exists nazionalita text;

comment on column public.profiles.nazionalita is
  'Codice ISO paese (es. IT, FR, ES). Opzionale.';
