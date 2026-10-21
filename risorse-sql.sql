-- ============================================================
-- CVI Virtual – Comparto unico "Download e Risorse"
-- Esegui UNA VOLTA nel SQL Editor di Supabase.
-- Sicuro da rieseguire: nessun dato viene cancellato.
-- ============================================================
-- Sostituisce progressivamente:
--   public.downloads  (file/link da scaricare)
--   public.biblioteca (guide, polar, setup, video, FAQ)
--
-- Le vecchie tabelle NON vengono eliminate: restano leggibili come
-- fallback finché la migrazione non è verificata. Potranno essere
-- rimosse in un secondo momento.
--
-- Visibilità:
--   pubblico -> visibile anche ai visitatori anonimi (RLS)
--   soci     -> solo utenti autenticati
-- ============================================================

create table if not exists public.risorse (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  titolo        text not null,
  tipo          text not null default 'file'
                check (tipo in ('file', 'scheda', 'video', 'link')),
  categoria     text not null default 'altro'
                check (categoria in (
                  'software', 'skin', 'mappe', 'regolamenti',
                  'guide', 'polar', 'setup', 'faq', 'altro'
                )),

  sommario      text,
  corpo         text,
  meta          text,          -- es. "ZIP · 48 MB" oppure "Lettura 5 min"

  url           text,          -- link esterno o download diretto
  url_video     text,          -- YouTube / Vimeo
  bucket        text,          -- bucket Storage privato (es. "risorse")
  private_path  text,          -- percorso nel bucket, scaricato con signed URL

  tags          text,          -- es. "vs5, patch, windows"
  visibilita    text not null default 'soci'
                check (visibilita in ('pubblico', 'soci')),
  pubblicato    boolean not null default true,
  ordine        integer not null default 0,

  legacy_source text           -- 'download' | 'biblioteca' (tracciabilità migrazione)
);

comment on table public.risorse is
  'Comparto unico Download e Risorse: file, schede, video e link con visibilità pubblico/soci.';

create index if not exists risorse_pub_idx
  on public.risorse (pubblicato, tipo, categoria, ordine);
create index if not exists risorse_vis_idx
  on public.risorse (visibilita, pubblicato);
create index if not exists risorse_legacy_idx
  on public.risorse (legacy_source);

-- updated_at automatico
create or replace function public.risorse_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_risorse_updated_at on public.risorse;
create trigger trg_risorse_updated_at
  before update on public.risorse
  for each row execute function public.risorse_touch_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.risorse enable row level security;

revoke all on public.risorse from anon, authenticated;
grant select on public.risorse to anon, authenticated;
grant insert, update, delete on public.risorse to authenticated;

-- Visitatore anonimo: solo risorse pubblicate e pubbliche.
drop policy if exists "risorse_anon_read" on public.risorse;
create policy "risorse_anon_read" on public.risorse
  for select to anon
  using (pubblicato = true and visibilita = 'pubblico');

-- Socio loggato: tutte le risorse pubblicate; lo staff vede anche le bozze.
drop policy if exists "risorse_auth_read" on public.risorse;
create policy "risorse_auth_read" on public.risorse
  for select to authenticated
  using (
    pubblicato = true
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
    )
  );

-- Scrittura: solo admin / scorer.
drop policy if exists "risorse_staff_all" on public.risorse;
create policy "risorse_staff_all" on public.risorse
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
  ));
-- ============================================================
-- Storage: bucket PRIVATO "risorse"
-- I file caricati qui non hanno URL pubblico: la pagina genera
-- un signed URL per i soci loggati.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('risorse', 'risorse', false, 52428800)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "risorse_storage_read" on storage.objects;
create policy "risorse_storage_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'risorse');

drop policy if exists "risorse_storage_insert" on storage.objects;
create policy "risorse_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'risorse'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
    )
  );

drop policy if exists "risorse_storage_update" on storage.objects;
create policy "risorse_storage_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'risorse'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
    )
  )
  with check (
    bucket_id = 'risorse'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
    )
  );

drop policy if exists "risorse_storage_delete" on storage.objects;
create policy "risorse_storage_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'risorse'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'scorer'))
    )
  );

-- ============================================================
-- Migrazione dati esistenti (idempotente, non cancella nulla)
-- ============================================================
do $$
declare
  has_bucket boolean := false;
  has_private boolean := false;
begin
  -- ---------- downloads ----------
  if to_regclass('public.downloads') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'downloads' and column_name = 'bucket'
    ) into has_bucket;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'downloads' and column_name = 'private_path'
    ) into has_private;

    execute format($mig$
      insert into public.risorse
        (id, created_at, titolo, tipo, categoria, sommario, corpo,
         meta, url, bucket, private_path, tags,
         visibilita, pubblicato, ordine, legacy_source)
      select
        d.id,
        coalesce(d.created_at, now()),
        d.titolo,
        case when lower(coalesce(d.tipo, '')) = 'link' then 'link' else 'file' end,
        'altro',
        d.descrizione,
        null,
        case lower(coalesce(d.tipo, ''))
          when 'pdf' then 'PDF'
          when 'zip' then 'ZIP'
          when 'exe' then 'EXE'
          when 'link' then 'Link'
          else 'File'
        end,
        d.url,
        %s,
        %s,
        null,
        'soci',
        coalesce(d.attivo, true),
        coalesce(d.ordine, 0),
        'download'
      from public.downloads d
      where d.titolo is not null
      on conflict (id) do nothing
    $mig$,
      case when has_bucket then 'd.bucket' else 'null::text' end,
      case when has_private then 'd.private_path' else 'null::text' end
    );
  end if;

  -- ---------- biblioteca ----------
  if to_regclass('public.biblioteca') is not null then
    insert into public.risorse
      (id, created_at, titolo, tipo, categoria, sommario, corpo, meta,
       url, url_video, tags, visibilita, pubblicato, ordine, legacy_source)
    select
      b.id,
      coalesce(b.created_at, now()),
      b.titolo,
      case
        when coalesce(b.url_video, '') <> '' then 'video'
        when coalesce(b.corpo, '') <> '' then 'scheda'
        else 'link'
      end,
      case
        when b.categoria in ('guide', 'polar', 'setup', 'faq') then b.categoria
        when b.categoria = 'video' then 'guide'
        else 'altro'
      end,
      b.sommario,
      b.corpo,
      null,
      b.url_file,
      b.url_video,
      b.tags,
      'soci',
      coalesce(b.pubblicato, true),
      coalesce(b.ordine, 0),
      'biblioteca'
    from public.biblioteca b
    where b.titolo is not null
    on conflict (id) do nothing;
  end if;
end $$;

comment on column public.risorse.legacy_source is
  'Origine della riga migrata: download oppure biblioteca. NULL per le risorse create dal nuovo pannello.';

notify pgrst, 'reload schema';

-- ============================================================
-- Verifica rapida (eseguire a parte)
-- ============================================================
-- select tipo, categoria, visibilita, count(*) from public.risorse group by 1,2,3 order by 1,2;
-- select count(*) from public.risorse where legacy_source = 'download';
-- select count(*) from public.risorse where legacy_source = 'biblioteca';

