-- ============================================================
-- CLASSLINK V3 — AWAMU 1: DASHIBODI YA MKUU
-- Function ya takwimu kamili + tahadhari
-- Endesha baada ya SQL zilizopita
-- ============================================================

-- Takwimu zote za dashibodi ya mkuu kwa call moja.
-- Inarudisha JSON yenye: takwimu, tahadhari, na mwenendo wa mahudhurio.
create or replace function head_dashboard(p_school_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
  v_month_start date := date_trunc('month', current_date)::date;
begin
  -- Ruhusa: super_admin, au yeyote wa shule hii (manager/staff)
  if not (is_super_admin() or p_school_id = auth_school_id()) then
    raise exception 'Huna ruhusa ya kuona takwimu za shule hii';
  end if;

  select json_build_object(

    -- ---- Wanafunzi ----
    'students_total',   (select count(*) from students where school_id = p_school_id and status = 'active'),
    'students_male',    (select count(*) from students where school_id = p_school_id and status = 'active' and gender = 'male'),
    'students_female',  (select count(*) from students where school_id = p_school_id and status = 'active' and gender = 'female'),

    -- ---- Wafanyakazi ----
    'teachers_total',   (select count(*) from profiles where school_id = p_school_id and role = 'teacher' and is_active),
    'staff_total',      (select count(*) from profiles where school_id = p_school_id and role in ('teacher','school_admin','school_owner') and is_active),

    -- ---- Taaluma ----
    'classes_total',    (select count(*) from classes where school_id = p_school_id),
    'subjects_total',   (select count(*) from subjects where school_id = p_school_id),

    -- ---- Mahudhurio ya leo ----
    'present_today',    (select count(*) from attendance where school_id = p_school_id and date = current_date and status = 'present'),
    'absent_today',     (select count(*) from attendance where school_id = p_school_id and date = current_date and status = 'absent'),
    'late_today',       (select count(*) from attendance where school_id = p_school_id and date = current_date and status = 'late'),
    'marked_today',     (select count(*) from attendance where school_id = p_school_id and date = current_date),

    -- ---- Ada ----
    'fees_billed',      (select coalesce(sum(total_amount),0) from fee_invoices where school_id = p_school_id),
    'fees_collected',   (select coalesce(sum(paid_amount),0) from fee_invoices where school_id = p_school_id),
    'fees_month',       (select coalesce(sum(amount),0) from fee_payments where school_id = p_school_id and paid_at >= v_month_start),
    'fees_today',       (select coalesce(sum(amount),0) from fee_payments where school_id = p_school_id and paid_at::date = current_date),
    'debtors_count',    (select count(*) from fee_invoices where school_id = p_school_id and status in ('unpaid','partial')),

    -- ---- TAHADHARI ----
    'alert_unpaid',     (select count(*) from fee_invoices where school_id = p_school_id and status in ('unpaid','partial') and due_date < current_date),
    'alert_exams_unpublished', (select count(*) from exams e
                                where e.school_id = p_school_id and not e.is_published
                                and exists (select 1 from results r where r.exam_id = e.id)),
    'alert_no_attendance_today', (
      -- madarasa ambayo hayajachukuliwa mahudhurio leo
      select count(*) from classes c
      where c.school_id = p_school_id
        and not exists (
          select 1 from attendance a
          where a.class_id = c.id and a.date = current_date
        )
    ),

    -- ---- Mwenendo wa mahudhurio: siku 7 zilizopita ----
    'attendance_trend', (
      select coalesce(json_agg(row_to_json(t) order by t.d), '[]'::json)
      from (
        select
          d::date as d,
          to_char(d, 'Dy') as day_label,
          (select count(*) from attendance a where a.school_id = p_school_id and a.date = d::date and a.status = 'present') as present,
          (select count(*) from attendance a where a.school_id = p_school_id and a.date = d::date and a.status = 'absent') as absent
        from generate_series(current_date - 6, current_date, '1 day') d
      ) t
    )

  ) into result;

  return result;
end;
$fn$;

grant execute on function head_dashboard(uuid) to authenticated;
