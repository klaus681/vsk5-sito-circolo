-- ============================================
-- CVI Virtual – Siti amici & link utili
-- Esegui nel SQL Editor di Supabase
-- (sicuro da rieseguire: IF NOT EXISTS / DROP POLICY IF EXISTS)
-- ============================================

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

create index if not exists siti_amici_attivo_ordine_idx
  on public.siti_amici (attivo, ordine);

-- updated_at automatico
create or replace function public.siti_amici_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_siti_amici_updated_at on public.siti_amici;
create trigger trg_siti_amici_updated_at
  before update on public.siti_amici
  for each row execute function public.siti_amici_touch_updated_at();

alter table public.siti_amici enable row level security;

-- Lettura pubblica: solo link attivi
drop policy if exists "siti_amici_select_pub" on public.siti_amici;
create policy "siti_amici_select_pub" on public.siti_amici
  for select using (attivo = true);

-- Admin / scorer: lettura completa + scrittura
drop policy if exists "siti_amici_admin_all" on public.siti_amici;
create policy "siti_amici_admin_all" on public.siti_amici
  for all to authenticated
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

grant select on public.siti_amici to anon, authenticated;
grant insert, update, delete on public.siti_amici to authenticated;

-- Seed iniziale (solo se la tabella è vuota)
insert into public.siti_amici (nome, url, descrizione, emoji, ordine, attivo)
select * from (values
  ('Federazione Italiana Vela', 'https://www.federvela.it/', 'FIV – la federazione della vela italiana', '🇮🇹', 10, true),
  ('World Sailing', 'https://www.sailing.org/', 'La federazione internazionale della vela', '🌍', 20, true),
  ('Virtual Skipper', 'https://www.virtualskipper-game.com/', 'Il simulatore di regate su cui corriamo', '⛵', 30, true),
  ('Nadeo', 'https://www.nadeo.com/', 'La software house di Virtual Skipper', '🎮', 40, true),
  ('Community CVI su Discord', 'https://discord.gg/Z4FUc79hX8', 'Il server ufficiale del circolo', '💬', 50, true)
) as v(nome, url, descrizione, emoji, ordine, attivo)
where not exists (select 1 from public.siti_amici limit 1);
