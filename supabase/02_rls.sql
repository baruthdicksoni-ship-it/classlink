-- ============================================================
-- CLASSLINK V3 — ROW LEVEL SECURITY
-- ============================================================
-- MUHIMU: Tunatumia SECURITY DEFINER functions ili kuepuka
-- infinite recursion (tatizo kubwa la ClassLink V2).
-- Function inasoma profiles bila kupitia RLS.
-- ============================================================

-- ------------------------------------------------------------
-- HELPER FUNCTIONS (bypass RLS — hii ndio siri)
-- ------------------------------------------------------------

create or replace function auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from profiles where id = auth.uid();
$$;

create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'super_admin' from profiles where id = auth.uid()), false);
$$;

create or replace function is_school_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('school_admin','teacher') from profiles where id = auth.uid()), false);
$$;

create or replace function is_school_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'school_admin' from profiles where id = auth.uid()), false);
$$;

-- Watoto wa mzazi aliyeingia
create or replace function my_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select student_id from guardians where parent_profile_id = auth.uid()
  union
  select id from students where profile_id = auth.uid();
$$;

grant execute on function auth_role() to authenticated;
grant execute on function auth_school_id() to authenticated;
grant execute on function is_super_admin() to authenticated;
grant execute on function is_school_staff() to authenticated;
grant execute on function is_school_admin() to authenticated;
grant execute on function my_student_ids() to authenticated;

-- ------------------------------------------------------------
-- ENABLE RLS
-- ------------------------------------------------------------

alter table schools              enable row level security;
alter table profiles             enable row level security;
alter table academic_years       enable row level security;
alter table terms                enable row level security;
alter table classes              enable row level security;
alter table subjects             enable row level security;
alter table teaching_assignments enable row level security;
alter table students             enable row level security;
alter table guardians            enable row level security;
alter table attendance           enable row level security;
alter table exams                enable row level security;
alter table results              enable row level security;
alter table grade_scales         enable row level security;
alter table fee_structures       enable row level security;
alter table fee_invoices         enable row level security;
alter table fee_payments         enable row level security;
alter table announcements        enable row level security;
alter table audit_logs           enable row level security;

-- ------------------------------------------------------------
-- SCHOOLS
-- ------------------------------------------------------------

create policy schools_select on schools for select to authenticated
  using ( is_super_admin() or id = auth_school_id() );

create policy schools_insert on schools for insert to authenticated
  with check ( is_super_admin() );

create policy schools_update on schools for update to authenticated
  using ( is_super_admin() or (is_school_admin() and id = auth_school_id()) );

create policy schools_delete on schools for delete to authenticated
  using ( is_super_admin() );

-- ------------------------------------------------------------
-- PROFILES
-- Hakuna subquery kwenye profiles ndani ya policy ya profiles.
-- ------------------------------------------------------------

create policy profiles_select_self on profiles for select to authenticated
  using ( id = auth.uid() );

create policy profiles_select_school on profiles for select to authenticated
  using ( is_super_admin() or school_id = auth_school_id() );

create policy profiles_insert on profiles for insert to authenticated
  with check ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );

create policy profiles_update_self on profiles for update to authenticated
  using ( id = auth.uid() );

create policy profiles_update_admin on profiles for update to authenticated
  using ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );

create policy profiles_delete on profiles for delete to authenticated
  using ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );

-- ------------------------------------------------------------
-- MACRO: tenant tables (kila mtu wa shule anasoma, admin anaandika)
-- ------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'academic_years','terms','classes','subjects',
    'teaching_assignments','grade_scales','fee_structures'
  ]
  loop
    execute format($f$
      create policy %1$s_select on %1$s for select to authenticated
        using ( is_super_admin() or school_id = auth_school_id() );
      create policy %1$s_write on %1$s for insert to authenticated
        with check ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );
      create policy %1$s_update on %1$s for update to authenticated
        using ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );
      create policy %1$s_delete on %1$s for delete to authenticated
        using ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );
    $f$, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- STUDENTS
-- ------------------------------------------------------------

create policy students_select on students for select to authenticated
  using (
    is_super_admin()
    or (is_school_staff() and school_id = auth_school_id())
    or id in (select my_student_ids())
  );

create policy students_insert on students for insert to authenticated
  with check ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );

create policy students_update on students for update to authenticated
  using ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );

create policy students_delete on students for delete to authenticated
  using ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );

-- ------------------------------------------------------------
-- GUARDIANS
-- ------------------------------------------------------------

create policy guardians_select on guardians for select to authenticated
  using (
    is_super_admin()
    or (is_school_staff() and school_id = auth_school_id())
    or parent_profile_id = auth.uid()
  );

create policy guardians_write on guardians for insert to authenticated
  with check ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );

create policy guardians_update on guardians for update to authenticated
  using ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );

create policy guardians_delete on guardians for delete to authenticated
  using ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );

-- ------------------------------------------------------------
-- ATTENDANCE (walimu wanaandika)
-- ------------------------------------------------------------

create policy attendance_select on attendance for select to authenticated
  using (
    is_super_admin()
    or (is_school_staff() and school_id = auth_school_id())
    or student_id in (select my_student_ids())
  );

create policy attendance_insert on attendance for insert to authenticated
  with check ( is_school_staff() and school_id = auth_school_id() );

create policy attendance_update on attendance for update to authenticated
  using ( is_school_staff() and school_id = auth_school_id() );

create policy attendance_delete on attendance for delete to authenticated
  using ( is_school_admin() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- EXAMS
-- ------------------------------------------------------------

create policy exams_select on exams for select to authenticated
  using (
    is_super_admin()
    or (is_school_staff() and school_id = auth_school_id())
    or (is_published and school_id = auth_school_id())
  );

create policy exams_insert on exams for insert to authenticated
  with check ( is_school_staff() and school_id = auth_school_id() );

create policy exams_update on exams for update to authenticated
  using ( is_school_staff() and school_id = auth_school_id() );

create policy exams_delete on exams for delete to authenticated
  using ( is_school_admin() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- RESULTS
-- ------------------------------------------------------------

create policy results_select on results for select to authenticated
  using (
    is_super_admin()
    or (is_school_staff() and school_id = auth_school_id())
    or (
      student_id in (select my_student_ids())
      and exists (select 1 from exams e where e.id = exam_id and e.is_published)
    )
  );

create policy results_insert on results for insert to authenticated
  with check ( is_school_staff() and school_id = auth_school_id() );

create policy results_update on results for update to authenticated
  using ( is_school_staff() and school_id = auth_school_id() );

create policy results_delete on results for delete to authenticated
  using ( is_school_admin() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- FEES
-- ------------------------------------------------------------

create policy invoices_select on fee_invoices for select to authenticated
  using (
    is_super_admin()
    or (is_school_staff() and school_id = auth_school_id())
    or student_id in (select my_student_ids())
  );

create policy invoices_write on fee_invoices for insert to authenticated
  with check ( is_school_admin() and school_id = auth_school_id() );

create policy invoices_update on fee_invoices for update to authenticated
  using ( is_school_admin() and school_id = auth_school_id() );

create policy invoices_delete on fee_invoices for delete to authenticated
  using ( is_school_admin() and school_id = auth_school_id() );

create policy payments_select on fee_payments for select to authenticated
  using (
    is_super_admin()
    or (is_school_staff() and school_id = auth_school_id())
    or student_id in (select my_student_ids())
  );

create policy payments_write on fee_payments for insert to authenticated
  with check ( is_school_admin() and school_id = auth_school_id() );

create policy payments_update on fee_payments for update to authenticated
  using ( is_school_admin() and school_id = auth_school_id() );

create policy payments_delete on fee_payments for delete to authenticated
  using ( is_school_admin() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- ANNOUNCEMENTS
-- ------------------------------------------------------------

create policy announcements_select on announcements for select to authenticated
  using ( is_super_admin() or school_id = auth_school_id() );

create policy announcements_write on announcements for insert to authenticated
  with check ( is_school_staff() and school_id = auth_school_id() );

create policy announcements_update on announcements for update to authenticated
  using ( is_school_staff() and school_id = auth_school_id() );

create policy announcements_delete on announcements for delete to authenticated
  using ( is_school_admin() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- AUDIT LOGS
-- ------------------------------------------------------------

create policy audit_select on audit_logs for select to authenticated
  using ( is_super_admin() or (is_school_admin() and school_id = auth_school_id()) );

create policy audit_insert on audit_logs for insert to authenticated
  with check ( true );
