-- ============================================
-- CVI Virtual - Meteo gara (condizioni impostate dall'admin)
-- Esegui UNA VOLTA nel SQL Editor di Supabase.
-- Sicuro da rieseguire (ADD COLUMN IF NOT EXISTS).
-- ============================================
--
-- La colonna "meteo" contiene un oggetto JSON con questa forma:
-- {
--   "visibile": true,
--   "regate": [
--     {
--       "ora": "21:00",              -- opzionale, altrimenti usa l'ora di data_gara
--       "vento_nodi": 12.5,
--       "vento_dir": 202.5,          -- direzione in gradi (0 = N, 90 = E)
--       "corrente_nodi": 0.8,
--       "corrente_dir": 0,
--       "temperatura": 16,
--       "condizioni": "Ventoso",
--       "nuvole": "Sparse"
--     }
--   ]
-- }
--
-- Se "visibile" e' false il pulsante Meteo non viene mostrato.
-- Se nessuna regata contiene dati, il pulsante non viene mostrato.

alter table public.gare
  add column if not exists meteo jsonb;

comment on column public.gare.meteo is
  'Condizioni meteo ufficiali della gara inserite dall''admin (vento, corrente, temperatura, condizioni). Vedi gare-meteo-sql.sql.';

-- Non serve altro: le policy RLS e i grant gia' presenti su public.gare
-- continuano a valere anche per la nuova colonna.
