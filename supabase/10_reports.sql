-- ============================================================
-- CLASSLINK V3 — AWAMU 4: RIPOTI
-- Endesha baada ya 09_approve_results.sql
-- ============================================================
-- Functions nne za ripoti za muhtasari:
--   report_attendance  — mahudhurio kwa darasa/muda
--   report_fees        — ada (waliolipa/wanaodaiwa)
--   report_students    — orodha ya wanafunzi + takwimu
--   report_results     — ufaulu wa darasa kwa mtihani
-- ============================================================

-- Helper ya ndani: hakikisha mwombaji ni staff wa shule
create or replace function assert_school_access(p_school_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  if not (is_super_admin() or (is_school_staff() and p_school_id = auth_school_id())) then
    raise exception 'Huna ruhusa ya kuona ripoti za shule hii';
  end if;
end;
$fn$;

grant execute on function assert_school_access(uuid) to authenticated;

-- ------------------------------------------------------------
-- 1. RIPOTI YA MAHUDHURIO
-- Kwa darasa (au shule nzima) kati ya tarehe mbili
-- ------------------------------------------------------------
create or replace function report_attendance(
  p_school_id uuid,
  p_from date,
  p_to date,
  p_class_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
begin
  perform assert_school_access(p_school_id);

  select json_build_object(
    'summary', (
      select json_build_object(
        'present', count(*) filter (where status = 'present'),
        'absent',  count(*) filter (where status = 'absent'),
        'late',    count(*) filter (where status = 'late'),
        'excused', count(*) filter (where status = 'excused'),
        'total',   count(*)
      )
      from attendance a
      where a.school_id = p_school_id
        and a.date between p_from and p_to
        and (p_class_id is null or a.class_id = p_class_id)
    ),
    'by_student', (
      select coalesce(json_agg(row_to_json(t) order by t.absent desc, t.name), '[]'::json)
      from (
        select
          concat_ws(' ', s.first_name, s.middle_name, s.last_name) as name,
          s.admission_no,
          count(*) filter (where a.status = 'present') as present,
          count(*) filter (where a.status = 'absent') as absent,
          count(*) filter (where a.status = 'late') as late,
          count(*) as total
        from attendance a
        join students s on s.id = a.student_id
        where a.school_id = p_school_id
          and a.date between p_from and p_to
          and (p_class_id is null or a.class_id = p_class_id)
        group by s.id, s.first_name, s.middle_name, s.last_name, s.admission_no
      ) t
    )
  ) into result;

  return result;
end;
$fn$;

-- ------------------------------------------------------------
-- 2. RIPOTI YA ADA
-- Muhtasari + orodha ya wanaodaiwa
-- ------------------------------------------------------------
create or replace function report_fees(p_school_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
begin
  perform assert_school_access(p_school_id);
  -- Ada ni nyeti — manager pekee (owner au mkuu)
  if not (is_super_admin() or is_school_manager()) then
    raise exception 'Ni mkuu au mmiliki pekee anayeweza kuona ripoti za ada';
  end if;

  select json_build_object(
    'summary', (
      select json_build_object(
        'billed',    coalesce(sum(total_amount),0),
        'collected', coalesce(sum(paid_amount),0),
        'balance',   coalesce(sum(total_amount - paid_amount),0),
        'invoices',  count(*),
        'paid',      count(*) filter (where status = 'paid'),
        'partial',   count(*) filter (where status = 'partial'),
        'unpaid',    count(*) filter (where status = 'unpaid')
      )
      from fee_invoices where school_id = p_school_id
    ),
    'debtors', (
      select coalesce(json_agg(row_to_json(t) order by t.balance desc), '[]'::json)
      from (
        select
          concat_ws(' ', s.first_name, s.middle_name, s.last_name) as name,
          s.admission_no,
          i.invoice_no,
          i.total_amount,
          i.paid_amount,
          (i.total_amount - i.paid_amount) as balance,
          i.due_date
        from fee_invoices i
        join students s on s.id = i.student_id
        where i.school_id = p_school_id and i.status in ('unpaid','partial')
      ) t
    )
  ) into result;

  return result;
end;
$fn$;

-- ------------------------------------------------------------
-- 3. RIPOTI YA WANAFUNZI
-- Orodha + takwimu kwa darasa/jinsia
-- ------------------------------------------------------------
create or replace function report_students(p_school_id uuid, p_class_id uuid default null)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
begin
  perform assert_school_access(p_school_id);

  select json_build_object(
    'summary', (
      select json_build_object(
        'total',  count(*),
        'male',   count(*) filter (where gender = 'male'),
        'female', count(*) filter (where gender = 'female')
      )
      from students
      where school_id = p_school_id and status = 'active'
        and (p_class_id is null or class_id = p_class_id)
    ),
    'by_class', (
      select coalesce(json_agg(row_to_json(t) order by t.class_name), '[]'::json)
      from (
        select
          case when c.stream is not null then c.name||' '||c.stream else c.name end as class_name,
          count(s.*) filter (where s.gender = 'male') as male,
          count(s.*) filter (where s.gender = 'female') as female,
          count(s.*) as total
        from classes c
        left join students s on s.class_id = c.id and s.status = 'active'
        where c.school_id = p_school_id
          and (p_class_id is null or c.id = p_class_id)
        group by c.id, c.name, c.stream
      ) t
    ),
    'students', (
      select coalesce(json_agg(row_to_json(t) order by t.name), '[]'::json)
      from (
        select
          concat_ws(' ', s.first_name, s.middle_name, s.last_name) as name,
          s.admission_no,
          s.gender,
          case when c.stream is not null then c.name||' '||c.stream else c.name end as class_name
        from students s
        left join classes c on c.id = s.class_id
        where s.school_id = p_school_id and s.status = 'active'
          and (p_class_id is null or s.class_id = p_class_id)
      ) t
    )
  ) into result;

  return result;
end;
$fn$;

-- ------------------------------------------------------------
-- 4. RIPOTI YA MATOKEO
-- Ufaulu wa darasa kwa mtihani — wanafunzi na nafasi zao
-- ------------------------------------------------------------
create or replace function report_results(p_school_id uuid, p_exam_id uuid, p_class_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
begin
  perform assert_school_access(p_school_id);

  select json_build_object(
    'exam', (select json_build_object('name', name, 'max_marks', max_marks, 'status', status)
             from exams where id = p_exam_id),
    'class', (select case when stream is not null then name||' '||stream else name end
              from classes where id = p_class_id),
    'ranking', (
      select coalesce(json_agg(row_to_json(t) order by t.total desc), '[]'::json)
      from (
        select
          concat_ws(' ', s.first_name, s.middle_name, s.last_name) as name,
          s.admission_no,
          count(r.*) as subjects,
          coalesce(sum(r.marks),0) as total,
          case when count(r.*) > 0 then round(avg(r.marks),1) else 0 end as average,
          rank() over (order by coalesce(sum(r.marks),0) desc) as position
        from students s
        left join results r on r.student_id = s.id and r.exam_id = p_exam_id
        where s.school_id = p_school_id and s.class_id = p_class_id and s.status = 'active'
        group by s.id, s.first_name, s.middle_name, s.last_name, s.admission_no
      ) t
    ),
    'summary', (
      select json_build_object(
        'students', count(distinct s.id),
        'class_average', case when count(r.*) > 0 then round(avg(r.marks),1) else 0 end
      )
      from students s
      left join results r on r.student_id = s.id and r.exam_id = p_exam_id
      where s.school_id = p_school_id and s.class_id = p_class_id and s.status = 'active'
    )
  ) into result;

  return result;
end;
$fn$;

grant execute on function report_attendance(uuid, date, date, uuid) to authenticated;
grant execute on function report_fees(uuid) to authenticated;
grant execute on function report_students(uuid, uuid) to authenticated;
grant execute on function report_results(uuid, uuid, uuid) to authenticated;
