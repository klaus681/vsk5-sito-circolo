-- ============================================
-- CVI Virtual – Logo delle squadre (team)
-- Esegui UNA VOLTA nel SQL Editor di Supabase
-- ============================================
-- logo_url = URL pubblico dell'immagine/logo della squadra
--            NULL/vuoto -> la card mostra le iniziali.

alter table public.teams
  add column if not exists logo_url text;

comment on column public.teams.logo_url is
  'URL pubblico del logo della squadra. NULL = fallback alle iniziali.';

-- ============================================
-- Storage: bucket pubblico "team-logos" (max 2 MB, solo immagini)
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-logos',
  'team-logos',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "team_logos_public_read" on storage.objects;
create policy "team_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'team-logos');

drop policy if exists "team_logos_insert_auth" on storage.objects;
create policy "team_logos_insert_auth"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'team-logos');

drop policy if exists "team_logos_update_auth" on storage.objects;
create policy "team_logos_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'team-logos');

drop policy if exists "team_logos_delete_auth" on storage.objects;
create policy "team_logos_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'team-logos');
