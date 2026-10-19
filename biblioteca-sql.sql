-- ============================================
-- CVI Virtual – Biblioteca tecnica
-- Solo testo + URL (Dropbox / YouTube). Esegui su Supabase.
-- Categorie: guide, polar, setup, video, faq
-- ============================================

create table if not exists public.biblioteca (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  titolo text not null,
  categoria text not null
    check (categoria in ('guide', 'polar', 'setup', 'video', 'faq')),
  sommario text,
  corpo text,

  url_file text,          -- Dropbox / link download
  url_video text,         -- YouTube / Vimeo
  url_esterno text,       -- altro link utile

  pubblicato boolean not null default true,
  ordine int not null default 0,
  tags text
);

create index if not exists biblioteca_cat_idx on public.biblioteca (categoria, ordine, updated_at desc);
create index if not exists biblioteca_pub_idx on public.biblioteca (pubblicato);

create or replace function public.biblioteca_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_biblioteca_updated_at on public.biblioteca;
create trigger trg_biblioteca_updated_at
  before update on public.biblioteca
  for each row execute function public.biblioteca_touch_updated_at();

alter table public.biblioteca enable row level security;

-- Soci autenticati: solo pubblicati
drop policy if exists "biblioteca_select_auth" on public.biblioteca;
create policy "biblioteca_select_auth" on public.biblioteca
  for select to authenticated
  using (
    pubblicato = true
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
    )
  );

-- Admin: tutto
drop policy if exists "biblioteca_admin_all" on public.biblioteca;
create policy "biblioteca_admin_all" on public.biblioteca
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or lower(coalesce(p.role,'')) in ('admin','scorer'))
  ));

grant select on public.biblioteca to authenticated;
grant insert, update, delete on public.biblioteca to authenticated;
