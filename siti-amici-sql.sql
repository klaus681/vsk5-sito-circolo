-- ============================================================
-- CVI Virtual – "Siti amici & link utili"
-- Tabella usata dal pannello Admin → Siti amici e dal banner in Home.
-- Esegui tutto nel SQL Editor di Supabase.
-- È sicuro rieseguirlo (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================

-- 1) Tabella ---------------------------------------------------
create table if not exists public.siti_amici (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nome text not null,
  url text not null,
  descrizione text,
  emoji text default '⚓',
  ordine int not null default 0,
  attivo boolean not null default true
);

-- Compatibilità con installazioni precedenti
alter table public.siti_amici add column if not exists descrizione text;
alter table public.siti_amici add column if not exists emoji text default '⚓';
alter table public.siti_amici add column if not exists ordine int not null default 0;
alter table public.siti_amici add column if not exists attivo boolean not null default true;
alter table public.siti_amici add column if not exists updated_at timestamptz not null default now();

-- Traduzioni opzionali (usate dal banner in Home quando la lingua non è IT).
-- Se restano vuote si mostra il testo italiano.
alter table public.siti_amici add column if not exists nome_en text;
alter table public.siti_amici add column if not exists nome_fr text;
alter table public.siti_amici add column if not exists nome_es text;
alter table public.siti_amici add column if not exists descrizione_en text;
alter table public.siti_amici add column if not exists descrizione_fr text;
alter table public.siti_amici add column if not exists descrizione_es text;

-- 2) Indice per la lettura pubblica ----------------------------
create index if not exists siti_amici_attivo_ordine_idx
  on public.siti_amici (attivo, ordine);

-- 3) updated_at automatico ------------------------------------
create or replace function public.siti_amici_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_siti_amici_updated_at on public.siti_amici;
create trigger trg_siti_amici_updated_at
  before update on public.siti_amici
  for each row execute function public.siti_amici_touch_updated_at();

-- 4) RLS ------------------------------------------------------
alter table public.siti_amici enable row level security;

-- Lettura pubblica (Home): solo i link attivi
drop policy if exists "siti_amici_select_pub" on public.siti_amici;
create policy "siti_amici_select_pub" on public.siti_amici
  for select
  to anon, authenticated
  using (attivo = true);

-- Admin / scorer: lettura completa + scrittura
drop policy if exists "siti_amici_admin_all" on public.siti_amici;
create policy "siti_amici_admin_all" on public.siti_amici
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
    )
  );

-- 5) Permessi -------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.siti_amici to anon, authenticated;
grant insert, update, delete on public.siti_amici to authenticated;

-- 6) Seed iniziale (solo se la tabella è vuota) ---------------
insert into public.siti_amici (nome, url, descrizione, emoji, ordine, attivo)
select * from (values
  ('Federazione Italiana Vela', 'https://www.federvela.it/', 'FIV – la federazione della vela italiana', '🇮🇹', 10, true),
  ('World Sailing', 'https://www.sailing.org/', 'La federazione internazionale della vela', '🌍', 20, true),
  ('Virtual Skipper', 'https://www.virtualskipper-game.com/', 'Il simulatore di regate su cui corriamo', '⛵', 30, true),
  ('Nadeo', 'https://www.nadeo.com/', 'La software house di Virtual Skipper', '🎮', 40, true),
  ('Community CVI su Discord', 'https://discord.gg/Z4FUc79hX8', 'Il server ufficiale del circolo', '💬', 50, true)
) as v(nome, url, descrizione, emoji, ordine, attivo)
where not exists (select 1 from public.siti_amici limit 1);

-- 7) Traduzioni dei link di esempio (solo dove il campo è ancora vuoto) ----
update public.siti_amici set
  nome_en = case url
    when 'https://www.federvela.it/' then 'Italian Sailing Federation'
    when 'https://www.sailing.org/' then 'World Sailing'
    when 'https://www.virtualskipper-game.com/' then 'Virtual Skipper'
    when 'https://www.nadeo.com/' then 'Nadeo'
    when 'https://discord.gg/Z4FUc79hX8' then 'CVI Community on Discord'
    else nome_en end,
  descrizione_en = case url
    when 'https://www.federvela.it/' then 'FIV – the Italian sailing federation'
    when 'https://www.sailing.org/' then 'The international sailing federation'
    when 'https://www.virtualskipper-game.com/' then 'The racing simulator we sail on'
    when 'https://www.nadeo.com/' then 'The software house behind Virtual Skipper'
    when 'https://discord.gg/Z4FUc79hX8' then 'The club official server'
    else descrizione_en end,
  nome_fr = case url
    when 'https://www.federvela.it/' then 'Fédération Italienne de Voile'
    when 'https://www.sailing.org/' then 'World Sailing'
    when 'https://www.virtualskipper-game.com/' then 'Virtual Skipper'
    when 'https://www.nadeo.com/' then 'Nadeo'
    when 'https://discord.gg/Z4FUc79hX8' then 'Communauté CVI sur Discord'
    else nome_fr end,
  descrizione_fr = case url
    when 'https://www.federvela.it/' then 'FIV – la fédération italienne de voile'
    when 'https://www.sailing.org/' then 'La fédération internationale de voile'
    when 'https://www.virtualskipper-game.com/' then 'Le simulateur de course que nous utilisons'
    when 'https://www.nadeo.com/' then 'Le studio derrière Virtual Skipper'
    when 'https://discord.gg/Z4FUc79hX8' then 'Le serveur officiel du club'
    else descrizione_fr end,
  nome_es = case url
    when 'https://www.federvela.it/' then 'Federación Italiana de Vela'
    when 'https://www.sailing.org/' then 'World Sailing'
    when 'https://www.virtualskipper-game.com/' then 'Virtual Skipper'
    when 'https://www.nadeo.com/' then 'Nadeo'
    when 'https://discord.gg/Z4FUc79hX8' then 'Comunidad CVI en Discord'
    else nome_es end,
  descrizione_es = case url
    when 'https://www.federvela.it/' then 'FIV – la federación italiana de vela'
    when 'https://www.sailing.org/' then 'La federación internacional de vela'
    when 'https://www.virtualskipper-game.com/' then 'El simulador de regatas que usamos'
    when 'https://www.nadeo.com/' then 'El estudio detrás de Virtual Skipper'
    when 'https://discord.gg/Z4FUc79hX8' then 'El servidor oficial del club'
    else descrizione_es end
where coalesce(nome_en, '') = '' or coalesce(nome_fr, '') = '' or coalesce(nome_es, '') = '';

-- 8) Forza PostgREST a ricaricare lo schema (utile subito dopo la creazione)
notify pgrst, 'reload schema';
