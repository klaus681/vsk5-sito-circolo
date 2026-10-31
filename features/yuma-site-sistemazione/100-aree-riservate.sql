-- ============================================================
-- YUMA – aree riservate: Area Membri / Area YUMA
-- Predispone l'autorizzazione backend delle due aree e della
-- futura Area Download. Idempotente.
-- Esegui DOPO 99-fix-policies.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) Helper: l'utente corrente e' un membro approvato?
--    (se hai gia' eseguito 99-fix-policies.sql esiste gia')
-- ------------------------------------------------------------
create or replace function public.is_approved_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'approved'
  );
$$;

revoke all on function public.is_approved_member() from public;
grant execute on function public.is_approved_member() to authenticated;

-- ------------------------------------------------------------
-- 2) Helper: l'utente corrente e' dell'equipaggio YUMA?
--    Usato dalle policy dell'Area YUMA e, in futuro, dai file
--    riservati al solo equipaggio.
-- ------------------------------------------------------------
create or replace function public.is_yuma()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'approved'
      and p.role in ('yuma', 'admin')
  );
$$;

revoke all on function public.is_yuma() from public;
grant execute on function public.is_yuma() to authenticated;

-- ------------------------------------------------------------
-- 3) AREA DOWNLOAD
--    La tabella e le policy sono in supabase/101-downloads.sql
--    (va eseguito dopo questo file). I contenuti delle due aree
--    si gestiscono dal pannello admin -> tab "Aree".
