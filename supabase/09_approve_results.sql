-- ============================================================
-- CLASSLINK V3 — AWAMU 3: KUIDHINISHA MATOKEO
-- Endesha baada ya 08_head_view_fees.sql
-- ============================================================
-- Mtiririko wa mtihani:
--   draft      -> mwalimu anaingiza matokeo
--   submitted  -> mwalimu amewasilisha, inasubiri idhini ya mkuu
--   approved   -> mkuu ameidhinisha
--   published  -> imetangazwa, wazazi/wanafunzi wanaona
--
-- is_published inabaki kwa uendani (backward compat):
--   published = true tu wakati status = 'published'
-- ============================================================

-- ------------------------------------------------------------
-- Ongeza safu mpya kwenye exams
-- ------------------------------------------------------------
alter table exams add column if not exists status text not null default 'draft'
  check (status in ('draft','submitted','approved','published'));

alter table exams add column if not exists submitted_by uuid references profiles(id) on delete set null;
alter table exams add column if not exists submitted_at timestamptz;
alter table exams add column if not exists approved_by uuid references profiles(id) on delete set null;
alter table exams add column if not exists approved_at timestamptz;
alter table exams add column if not exists published_at timestamptz;

-- Sasisha data iliyopo: iliyokuwa published tayari, iwe 'published'
update exams set status = 'published' where is_published = true and status = 'draft';

-- ------------------------------------------------------------
-- Function: wasilisha mtihani kwa idhini (mwalimu)
-- ------------------------------------------------------------
create or replace function submit_exam(p_exam_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
begin
  select school_id into v_school from exams where id = p_exam_id;
  if v_school is null then raise exception 'Mtihani haupo'; end if;

  -- Lazima uwe staff wa shule hii
  if not (is_super_admin() or (is_school_staff() and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa';
  end if;

  update exams
  set status = 'submitted', submitted_by = auth.uid(), submitted_at = now()
  where id = p_exam_id and status = 'draft';
end;
$fn$;

-- ------------------------------------------------------------
-- Function: idhinisha mtihani (mkuu/mmiliki pekee)
-- ------------------------------------------------------------
create or replace function approve_exam(p_exam_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
begin
  select school_id into v_school from exams where id = p_exam_id;
  if v_school is null then raise exception 'Mtihani haupo'; end if;

  -- Manager pekee (mkuu au mmiliki)
  if not (is_super_admin() or (is_school_manager() and v_school = auth_school_id())) then
    raise exception 'Ni mkuu au mmiliki pekee anayeweza kuidhinisha matokeo';
  end if;

  update exams
  set status = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = p_exam_id and status = 'submitted';
end;
$fn$;

-- ------------------------------------------------------------
-- Function: tangaza mtihani (mkuu/mmiliki, baada ya idhini)
-- ------------------------------------------------------------
create or replace function publish_exam(p_exam_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
  v_status text;
begin
  select school_id, status into v_school, v_status from exams where id = p_exam_id;
  if v_school is null then raise exception 'Mtihani haupo'; end if;

  if not (is_super_admin() or (is_school_manager() and v_school = auth_school_id())) then
    raise exception 'Ni mkuu au mmiliki pekee anayeweza kutangaza matokeo';
  end if;

  -- Lazima iwe imeidhinishwa kwanza
  if v_status <> 'approved' then
    raise exception 'Matokeo lazima yaidhinishwe kabla ya kutangazwa';
  end if;

  update exams
  set status = 'published', is_published = true, published_at = now()
  where id = p_exam_id;
end;
$fn$;

-- ------------------------------------------------------------
-- Function: rudisha mtihani kuwa rasimu (mkuu akitaka marekebisho)
-- ------------------------------------------------------------
create or replace function reject_exam(p_exam_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
begin
  select school_id into v_school from exams where id = p_exam_id;
  if v_school is null then raise exception 'Mtihani haupo'; end if;

  if not (is_super_admin() or (is_school_manager() and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa';
  end if;

  update exams
  set status = 'draft', is_published = false,
      submitted_by = null, submitted_at = null,
      approved_by = null, approved_at = null
  where id = p_exam_id;
end;
$fn$;

grant execute on function submit_exam(uuid) to authenticated;
grant execute on function approve_exam(uuid) to authenticated;
grant execute on function publish_exam(uuid) to authenticated;
grant execute on function reject_exam(uuid) to authenticated;

-- ------------------------------------------------------------
-- Function: report card ya mwanafunzi kwa mtihani
-- Inarudisha matokeo yote + nafasi + wastani
-- ------------------------------------------------------------
create or replace function student_report_card(p_student_id uuid, p_exam_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
  v_school uuid;
begin
  select school_id into v_school from students where id = p_student_id;
  if v_school is null then raise exception 'Mwanafunzi hapatikani'; end if;

  -- Ruhusa: staff wa shule, au mzazi/mwanafunzi mwenyewe (kama imetangazwa)
  if not (
    is_super_admin()
    or (is_school_staff() and v_school = auth_school_id())
    or (
      p_student_id in (select my_student_ids())
      and exists (select 1 from exams where id = p_exam_id and status = 'published')
    )
  ) then
    raise exception 'Huna ruhusa kuona ripoti hii';
  end if;

  select json_build_object(
    'student', (
      select json_build_object(
        'id', s.id, 'admission_no', s.admission_no,
        'name', concat_ws(' ', s.first_name, s.middle_name, s.last_name),
        'gender', s.gender,
        'class', (select case when c.stream is not null then c.name||' '||c.stream else c.name end
                  from classes c where c.id = s.class_id)
      ) from students s where s.id = p_student_id
    ),
    'exam', (
      select json_build_object('id', e.id, 'name', e.name, 'type', e.exam_type,
        'max_marks', e.max_marks, 'status', e.status)
      from exams e where e.id = p_exam_id
    ),
    'school', (
      select json_build_object('name', sc.name, 'motto', sc.motto, 'logo_url', sc.logo_url)
      from schools sc where sc.id = v_school
    ),
    'results', (
      select coalesce(json_agg(json_build_object(
        'subject', sub.name,
        'code', sub.code,
        'marks', r.marks,
        'grade', r.grade,
        'remarks', r.remarks
      ) order by sub.name), '[]'::json)
      from results r
      join subjects sub on sub.id = r.subject_id
      where r.student_id = p_student_id and r.exam_id = p_exam_id
    ),
    'summary', (
      select json_build_object(
        'total', coalesce(sum(r.marks),0),
        'subjects_count', count(*),
        'average', case when count(*) > 0 then round(avg(r.marks), 1) else 0 end
      )
      from results r where r.student_id = p_student_id and r.exam_id = p_exam_id
    )
  ) into result;

  return result;
end;
$fn$;

grant execute on function student_report_card(uuid, uuid) to authenticated;
