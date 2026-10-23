-- ============================================
-- CVI Virtual – Tornei: regate VSK e classifiche
-- Aggiunge ai tornei la gestione di regate "interne" importate dai log
-- di Virtual Skipper (Result_*.csv), con classifica Low/High Point e scarti.
-- Non tocca le gare ufficiali né la classifica da risultati_gara.
--
-- Esegui nel SQL Editor di Supabase (dopo tornei-sql.sql).
-- Sicuro da rieseguire (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================

-- ---------- OPZIONI CLASSIFICA VSK (separate da tornei.scarti) ----------
alter table public.tornei
  add column if not exists vsk_sistema_punteggio text not null default 'low_point';

alter table public.tornei
  add column if not exists vsk_scarti int not null default 0;

alter table public.tornei
  add column if not exists vsk_scarti_auto boolean not null default false;

alter table public.tornei
  add column if not exists vsk_mostra_home boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tornei_vsk_sistema_chk'
  ) then
    alter table public.tornei
      add constraint tornei_vsk_sistema_chk
      check (vsk_sistema_punteggio in ('low_point', 'high_point'));
  end if;
end $$;

comment on column public.tornei.vsk_sistema_punteggio is
  'Sistema punteggio classifica VSK: low_point / high_point';
comment on column public.tornei.vsk_scarti is
  'Numero di scarti per la classifica VSK (0 = nessuno)';
comment on column public.tornei.vsk_scarti_auto is
  'true = 1 scarto ogni 4 regate VSK (ignora vsk_scarti)';
comment on column public.tornei.vsk_mostra_home is
  'true = podio classifica VSK visibile in Home';

-- ---------- REGATE VSK DEL TORNEO ----------
create table if not exists public.torneo_regate (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  torneo_id uuid not null references public.tornei(id) on delete cascade,
  titolo text not null,
  data_regata timestamptz,
  ordine int not null default 0,
  sorgente_file text,
  note text
);

create index if not exists torneo_regate_torneo_idx
  on public.torneo_regate (torneo_id, ordine);

create index if not exists torneo_regate_sorgente_idx
  on public.torneo_regate (torneo_id, sorgente_file);

-- ---------- RISULTATI DELLE REGATE VSK ----------
create table if not exists public.torneo_risultati (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  regata_id uuid not null references public.torneo_regate(id) on delete cascade,
  nickname text not null,
  nickname_raw text,
  account_vsk text,
  team text,
  stato text not null default 'FIN'
    check (stato in ('FIN', 'DNF', 'DNS', 'DSQ', 'RET')),
  posizione int check (posizione is null or posizione >= 1),
  tempo_ms integer check (tempo_ms is null or tempo_ms >= 0),
  note text,
  unique (regata_id, nickname)
);

create index if not exists torneo_risultati_regata_idx
  on public.torneo_risultati (regata_id);

create index if not exists torneo_risultati_nick_idx
  on public.torneo_risultati (nickname);

-- ---------- updated_at automatico ----------
create or replace function public.tornei_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_torneo_regate_updated on public.torneo_regate;
create trigger trg_torneo_regate_updated
  before update on public.torneo_regate
  for each row execute function public.tornei_touch_updated_at();

drop trigger if exists trg_torneo_risultati_updated on public.torneo_risultati;
create trigger trg_torneo_risultati_updated
  before update on public.torneo_risultati
  for each row execute function public.tornei_touch_updated_at();

-- ---------- RLS ----------
alter table public.torneo_regate enable row level security;
alter table public.torneo_risultati enable row level security;

-- Lettura pubblica: solo tornei pubblicati
drop policy if exists "torneo_regate_public_read" on public.torneo_regate;
create policy "torneo_regate_public_read" on public.torneo_regate
  for select using (
    exists (
      select 1 from public.tornei t
      where t.id = torneo_id and t.pubblicato = true
    )
  );

drop policy if exists "torneo_risultati_public_read" on public.torneo_risultati;
create policy "torneo_risultati_public_read" on public.torneo_risultati
  for select using (
    exists (
      select 1 from public.torneo_regate r
      join public.tornei t on t.id = r.torneo_id
      where r.id = regata_id and t.pubblicato = true
    )
  );

-- Admin / scorer: lettura completa + scrittura
drop policy if exists "torneo_regate_admin_all" on public.torneo_regate;
create policy "torneo_regate_admin_all" on public.torneo_regate
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))));

drop policy if exists "torneo_risultati_admin_all" on public.torneo_risultati;
create policy "torneo_risultati_admin_all" on public.torneo_risultati
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))));

-- ---------- GRANT ----------
grant select on public.torneo_regate to anon, authenticated;
grant select on public.torneo_risultati to anon, authenticated;
grant insert, update, delete on public.torneo_regate to authenticated;
grant insert, update, delete on public.torneo_risultati to authenticated;
