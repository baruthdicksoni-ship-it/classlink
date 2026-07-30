-- ============================================================
-- CLASSLINK V3 — AKAUNTI YA MKUU WA TAALUMA (ACADEMIC MASTER)
-- Endesha baada ya 20_student_details_fees.sql
-- ============================================================
-- Mkuu wa taaluma: anasimamia TAALUMA YOTE ya shule nzima
--   (madarasa, masomo, ratiba, mitihani, matokeo, nidhamu,
--    mahudhurio, wanafunzi wote) — LAKINI si fedha wala HR.
-- Yuko kati ya mwalimu (darasa lake) na mkuu (shule nzima).
--
-- Sehemu:
--   1. Cheo kipya 'academic_master'
--   2. Helper is_academic_lead() (manager + academic_master)
--   3. Kuunganisha kwenye RLS za taaluma (wanafunzi wote, n.k.)
--   4. Ruhusa ya kuidhinisha/kuchapisha matokeo
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ongeza cheo 'academic_master'
-- ------------------------------------------------------------
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('super_admin','school_owner','school_admin','academic_master','teacher','accountant','staff','parent','student'));

-- Mkuu wa taaluma ni staff wa shule
create or replace function is_school_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select role in ('school_owner','school_admin','academic_master','teacher','accountant','staff')
  from profiles where id = auth.uid();
$fn$;

-- ------------------------------------------------------------
-- 2. Helper: nani anaongoza taaluma (manager + academic_master)
-- ------------------------------------------------------------
create or replace function is_academic_lead()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(
    (select role in ('school_owner','school_admin','academic_master')
     from profiles where id = auth.uid()),
    false
  );
$fn$;

grant execute on function is_academic_lead() to authenticated;

-- ------------------------------------------------------------
-- 3. Wanafunzi: mkuu wa taaluma aone WOTE wa shule
-- ------------------------------------------------------------
drop policy if exists students_select on students;
create policy students_select on students for select to authenticated
  using (
    is_super_admin()
    or (is_academic_lead() and school_id = auth_school_id())    -- mkuu/mmiliki/taaluma: wote
    or (can_manage_fees() and school_id = auth_school_id())     -- mhasibu: wote (kwa ada)
    or (
      auth_role() in ('teacher','staff')                        -- mwalimu/staff: wa madarasa yao
      and school_id = auth_school_id()
      and class_id in (select my_class_ids())
    )
    or id in (select my_student_ids())                          -- mzazi/mwanafunzi: wao
  );

-- ------------------------------------------------------------
-- 4. Kuidhinisha/kuchapisha matokeo: ongeza academic_master
-- ------------------------------------------------------------
-- Functions za matokeo (09) zilitumia is_school_manager().
-- Tunazibadilisha zitumie is_academic_lead() ili mkuu wa
-- taaluma naye aweze kuidhinisha na kuchapisha.
-- ------------------------------------------------------------

-- approve_exam
create or replace function approve_exam(p_exam_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare v_school uuid;
begin
  select school_id into v_school from exams where id = p_exam_id;
  if v_school is null then raise exception 'Mtihani haupatikani'; end if;
  if not (is_super_admin() or (is_academic_lead() and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa ya kuidhinisha matokeo';
  end if;
  update exams set status = 'approved' where id = p_exam_id and status = 'submitted';
end;
$fn$;

-- publish_exam
create or replace function publish_exam(p_exam_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare v_school uuid;
begin
  select school_id into v_school from exams where id = p_exam_id;
  if v_school is null then raise exception 'Mtihani haupatikani'; end if;
  if not (is_super_admin() or (is_academic_lead() and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa ya kuchapisha matokeo';
  end if;
  update exams
  set status = 'published', is_published = true, published_at = now()
  where id = p_exam_id and status = 'approved';
end;
$fn$;

-- reject_exam (paramita moja — ilingane na 09)
create or replace function reject_exam(p_exam_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare v_school uuid;
begin
  select school_id into v_school from exams where id = p_exam_id;
  if v_school is null then raise exception 'Mtihani haupatikani'; end if;
  if not (is_super_admin() or (is_academic_lead() and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa';
  end if;
  update exams set status = 'draft', is_published = false
  where id = p_exam_id and status in ('submitted','approved');
end;
$fn$;

grant execute on function approve_exam(uuid) to authenticated;
grant execute on function publish_exam(uuid) to authenticated;
grant execute on function reject_exam(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. Dashibodi ya mkuu wa taaluma (takwimu za taaluma)
-- ------------------------------------------------------------
create or replace function academic_master_dashboard(p_school_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
begin
  if not (is_super_admin() or (is_academic_lead() and p_school_id = auth_school_id())) then
    raise exception 'Huna ruhusa ya kuona takwimu za taaluma';
  end if;

  select json_build_object(
    'students_total',   (select count(*) from students where school_id = p_school_id and status = 'active'),
    'teachers_total',   (select count(*) from profiles where school_id = p_school_id and role = 'teacher' and is_active),
    'classes_total',    (select count(*) from classes where school_id = p_school_id),
    'subjects_total',   (select count(*) from subjects where school_id = p_school_id),
    'present_today',    (select count(*) from attendance where school_id = p_school_id and date = current_date and status = 'present'),
    'marked_today',     (select count(*) from attendance where school_id = p_school_id and date = current_date),
    -- Mitihani inayosubiri kuidhinishwa
    'exams_pending',    (select count(*) from exams where school_id = p_school_id and status = 'submitted'),
    'exams_draft',      (select count(*) from exams where school_id = p_school_id and status = 'draft'),
    -- Madarasa yasiyochukua mahudhurio leo
    'alert_no_attendance', (select count(*) from classes c where c.school_id = p_school_id and not exists (
       select 1 from attendance a where a.class_id = c.id and a.date = current_date)),
    -- Kesi za nidhamu wazi
    'alert_discipline_open', (select count(*) from discipline_cases where school_id = p_school_id and status = 'open'),
    -- Mwenendo wa mahudhurio siku 7
    'attendance_trend', (
      select coalesce(json_agg(row_to_json(t) order by t.d), '[]'::json)
      from (
        select d::date as d, to_char(d, 'Dy') as day_label,
          (select count(*) from attendance a where a.school_id = p_school_id and a.date = d::date and a.status = 'present') as present,
          (select count(*) from attendance a where a.school_id = p_school_id and a.date = d::date and a.status = 'absent') as absent
        from generate_series(current_date - 6, current_date, '1 day') d
      ) t
    )
  ) into result;

  return result;
end;
$fn$;

grant execute on function academic_master_dashboard(uuid) to authenticated;
