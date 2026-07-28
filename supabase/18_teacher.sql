-- ============================================================
-- CLASSLINK V3 — AKAUNTI YA MWALIMU
-- Endesha baada ya 17_settings.sql
-- ============================================================
-- Functions za kubainisha "madarasa/wanafunzi wa mwalimu":
--   my_class_ids()        — madarasa anayofundisha + anayosimamia
--   my_taught_student_ids — wanafunzi wa madarasa hayo
--   teacher_dashboard     — takwimu za mwalimu (vipindi vya leo, n.k.)
-- ============================================================

-- ------------------------------------------------------------
-- Madarasa ya mwalimu: anayofundisha (teaching_assignments)
--   + anayosimamia (class_teacher_id)
-- ------------------------------------------------------------
create or replace function my_class_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select class_id from teaching_assignments where teacher_id = auth.uid()
  union
  select id from classes where class_teacher_id = auth.uid()
$fn$;

grant execute on function my_class_ids() to authenticated;

-- ------------------------------------------------------------
-- Wanafunzi wa madarasa ya mwalimu
-- ------------------------------------------------------------
create or replace function my_taught_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select id from students
  where class_id in (select my_class_ids()) and status = 'active'
$fn$;

grant execute on function my_taught_student_ids() to authenticated;

-- ------------------------------------------------------------
-- Dashibodi ya mwalimu — takwimu zake pekee
-- ------------------------------------------------------------
create or replace function teacher_dashboard(p_teacher_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
  v_school uuid;
  v_dow int := extract(isodow from current_date);  -- 1=Jumatatu
begin
  select school_id into v_school from profiles where id = p_teacher_id;
  if v_school is null then raise exception 'Mwalimu hapatikani'; end if;

  -- Ruhusa: mwalimu mwenyewe, au manager wa shule
  if not (
    p_teacher_id = auth.uid()
    or is_super_admin()
    or (is_school_manager() and v_school = auth_school_id())
  ) then
    raise exception 'Huna ruhusa';
  end if;

  select json_build_object(
    -- Madarasa anayofundisha/kusimamia
    'classes_count', (
      select count(distinct c) from (
        select class_id c from teaching_assignments where teacher_id = p_teacher_id
        union
        select id from classes where class_teacher_id = p_teacher_id
      ) x
    ),
    -- Masomo anayofundisha
    'subjects_count', (
      select count(distinct subject_id) from teaching_assignments where teacher_id = p_teacher_id
    ),
    -- Wanafunzi wa madarasa yake
    'students_count', (
      select count(*) from students
      where class_id in (
        select class_id from teaching_assignments where teacher_id = p_teacher_id
        union
        select id from classes where class_teacher_id = p_teacher_id
      ) and status = 'active'
    ),
    -- Darasa anasimamia (class teacher)
    'is_class_teacher', exists(select 1 from classes where class_teacher_id = p_teacher_id),
    'managed_class', (
      select case when stream is not null then name||' '||stream else name end
      from classes where class_teacher_id = p_teacher_id limit 1
    ),
    -- Vipindi vya leo (kutoka ratiba)
    'today_periods', (
      select coalesce(json_agg(row_to_json(t) order by t.start_time), '[]'::json)
      from (
        select ts.start_time, ts.end_time, ts.room,
          sub.name as subject,
          case when c.stream is not null then c.name||' '||c.stream else c.name end as class_name
        from timetable_slots ts
        left join subjects sub on sub.id = ts.subject_id
        left join classes c on c.id = ts.class_id
        where ts.teacher_id = p_teacher_id and ts.day_of_week = v_dow
          and ts.slot_type = 'lesson'
      ) t
    ),
    -- Mitihani yake ambayo bado ni rasimu (anahitaji kuwasilisha)
    'pending_exams', (
      select count(*) from exams e
      where e.school_id = v_school and e.status = 'draft'
        and exists (
          select 1 from teaching_assignments ta
          where ta.teacher_id = p_teacher_id
        )
    )
  ) into result;

  return result;
end;
$fn$;

grant execute on function teacher_dashboard(uuid) to authenticated;

-- ============================================================
-- RBAC KALI: Mwalimu aone wanafunzi wa madarasa yake pekee
-- ============================================================
-- Kabla: is_school_staff() iliona wanafunzi WOTE wa shule.
-- Sasa: manager anaona wote; mwalimu anaona wa madarasa yake;
--       mzazi/mwanafunzi anaona wake.
-- ------------------------------------------------------------
drop policy if exists students_select on students;
create policy students_select on students for select to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())   -- mkuu/mmiliki: wote
    or (
      -- mwalimu/staff: wa madarasa yao pekee
      auth_role() in ('teacher','staff')
      and school_id = auth_school_id()
      and class_id in (select my_class_ids())
    )
    or id in (select my_student_ids())                          -- mzazi/mwanafunzi: wao
  );
