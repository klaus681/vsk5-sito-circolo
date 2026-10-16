-- ============================================
-- CVI Virtual – Colore delle squadre (team)
-- Esegui UNA VOLTA nel SQL Editor di Supabase
-- ============================================
-- tema puo' contenere:
--   NULL / ''                  -> colore automatico (derivato dal nome)
--   sky | teal | amber | violet | red -> una delle palette predefinite
--   #rrggbb (o #rgb)           -> colore personalizzato

alter table public.teams
  add column if not exists tema text;

comment on column public.teams.tema is
  'Colore squadra: palette (sky|teal|amber|violet|red) oppure esadecimale (#rrggbb). NULL = automatico dal nome.';
