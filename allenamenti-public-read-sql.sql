-- ============================================
-- CVI – lettura pubblica allenamenti pubblicati
-- (calendario + banner home per tutti i visitatori)
-- Esegui UNA VOLTA nel SQL Editor di Supabase
-- ============================================

-- Prima: solo authenticated. Ora anche anon può vedere gli slot pubblicati.
drop policy if exists "allenamenti_select_auth" on public.allenamenti;
drop policy if exists "allenamenti_select_pub" on public.allenamenti;

create policy "allenamenti_select_pub" on public.allenamenti
  for select
  using (pubblicato = true);

-- Iscrizioni restano solo per soci autenticati (policy già presenti)

grant select on public.allenamenti to anon, authenticated;
