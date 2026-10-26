-- ============================================
-- CVI Virtual – Realtime per la pagina Live
-- Esegui UNA VOLTA nel SQL Editor di Supabase.
-- Sicuro da rieseguire (DUPLICATE_OBJECT viene ignorato).
-- ============================================
-- La pagina live.html aggiorna iscritti e risultati con Supabase Realtime
-- (postgres_changes). Il polling resta attivo come fallback, quindi il sito
-- funziona anche se questo script non viene eseguito.
--
-- Richiede che la publication supabase_realtime esista (Supabase la crea
-- automaticamente). Aggiunge le tabelle usate dalla pagina Live e imposta
-- REPLICA IDENTITY FULL per ricevere correttamente anche UPDATE/DELETE
-- filtrati per gara_id.

do $$
declare
  t text;
  tabelle text[] := array['gare', 'iscrizioni_gare', 'risultati_gara'];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Publication supabase_realtime non trovata: abilita Realtime dal dashboard Supabase.';
    return;
  end if;

  foreach t in array tabelle loop
    if to_regclass('public.' || t) is not null then
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception
        when duplicate_object then null;
        when undefined_object then null;
      end;

      execute format('alter table public.%I replica identity full', t);
    else
      raise notice 'Tabella public.% non trovata: script saltato per questa tabella.', t;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ============================================
-- Verifica: devono comparire gare, iscrizioni_gare e risultati_gara
-- ============================================
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;

-- Nota: il realtime rispetta le policy RLS. Se la pagina Live è pubblica,
-- assicurati che gare / iscrizioni_gare / risultati_gara siano leggibili
-- dai ruoli anon e authenticated (come per le query REST già usate).
