-- ============================================
-- CVI Virtual – campo TIPO sulle gare
-- Esegui UNA VOLTA nel SQL Editor di Supabase
-- ============================================
-- ufficiale = gara soci (iscrizione + classifica)
-- speciale  = evento speciale (iscrizione + classifica)
-- aperto    = evento aperto (NO iscrizione, NO classifica)

alter table public.gare
  add column if not exists tipo text not null default 'ufficiale';

-- Vincolo sui valori ammessi (se non esiste già)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'gare_tipo_check'
  ) then
    alter table public.gare
      add constraint gare_tipo_check
      check (tipo in ('ufficiale', 'speciale', 'aperto'));
  end if;
end $$;

-- Indice utile per filtri
create index if not exists gare_tipo_idx on public.gare (tipo);

-- Le gare già esistenti restano 'ufficiale' (default)
comment on column public.gare.tipo is
  'ufficiale|speciale = iscrizione + classifica; aperto = no iscrizione, no classifica';
