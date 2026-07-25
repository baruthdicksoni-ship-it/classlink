-- ============================================================
-- CLASSLINK V3 — NYONGEZA: ROLE YA MMILIKI (school_owner)
-- Endesha baada ya SQL tatu za msingi
-- ============================================================

-- 1) Ruhusu role mpya kwenye profiles
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('super_admin','school_owner','school_admin','teacher','parent','student'));

-- 2) school_owner naye ana school_id (kama admin), si super_admin
--    (constraint ya chk_school_required tayari inaruhusu hili — role yoyote
--     isiyo super_admin lazima iwe na school_id)

-- 3) Sasisha helper: staff sasa ni owner + admin + teacher
create or replace function is_school_staff()
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select coalesce(
    (select role in ('school_owner','school_admin','teacher') from profiles where id = auth.uid()),
    false
  );
$fn$;

-- 4) Helper mpya: owner au admin (wanaosimamia shule)
create or replace function is_school_manager()
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select coalesce(
    (select role in ('school_owner','school_admin') from profiles where id = auth.uid()),
    false
  );
$fn$;

-- 5) Helper mpya: mmiliki pekee
create or replace function is_school_owner()
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select coalesce(
    (select role = 'school_owner' from profiles where id = auth.uid()),
    false
  );
$fn$;

grant execute on function is_school_manager() to authenticated;
grant execute on function is_school_owner() to authenticated;
