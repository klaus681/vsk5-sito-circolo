-- ============================================
-- CVI Virtual – Limite massimo iscritti per gara
-- Esegui UNA VOLTA nel SQL Editor di Supabase
-- ============================================
-- max_iscritti = null  -> nessun limite (illimitato)
-- max_iscritti >= 1     -> numero massimo di iscritti ammessi
-- Il limite viene applicato lato server tramite trigger,
-- così non è aggirabile dal client.

alter table public.gare
  add column if not exists max_iscritti integer;

-- Vincolo sui valori ammessi (se non esiste già)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'gare_max_iscritti_check'
  ) then
    alter table public.gare
      add constraint gare_max_iscritti_check
      check (max_iscritti is null or max_iscritti >= 1);
  end if;
end $$;

comment on column public.gare.max_iscritti is
  'Numero massimo di iscritti ammessi alla gara. NULL = illimitato.';

-- --------------------------------------------
-- Enforcement lato server: blocca l'iscrizione
-- quando la gara ha raggiunto il numero massimo
-- --------------------------------------------
create or replace function public.enforce_max_iscritti()
returns trigger
language plpgsql
as $$
declare
  cap integer;
  cnt integer;
begin
  select max_iscritti into cap from public.gare where id = new.gara_id;
  if cap is not null then
    select count(*) into cnt
      from public.iscrizioni_gare
     where gara_id = new.gara_id;
    if cnt >= cap then
      raise exception 'Gara al completo: numero massimo di iscritti raggiunto (%)', cap
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_max_iscritti on public.iscrizioni_gare;
create trigger trg_enforce_max_iscritti
  before insert on public.iscrizioni_gare
  for each row execute function public.enforce_max_iscritti();
