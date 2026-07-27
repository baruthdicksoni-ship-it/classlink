-- ============================================================
-- CLASSLINK V3 — AWAMU 5: NIDHAMU
-- Endesha baada ya 10_reports.sql
-- ============================================================
-- Jedwali jipya: discipline_cases
-- Mtiririko wa kesi:
--   open      -> kesi imefunguliwa, inasubiri hatua
--   resolved  -> imeshughulikiwa (adhabu/maamuzi yametolewa)
--   dismissed -> imeachwa (hakuna hatua)
-- ============================================================

create table discipline_cases (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,

  -- Taarifa za kesi
  incident_date date not null default current_date,
  category text not null default 'other' check (category in (
    'lateness','absenteeism','misconduct','fighting','property_damage',
    'dishonesty','uniform','other'
  )),
  severity text not null default 'minor' check (severity in ('minor','moderate','serious')),
  description text not null,

  -- Hatua/maamuzi
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  action_taken text,
  parent_notified boolean not null default false,

  -- Nani alifanya nini
  reported_by uuid references profiles(id) on delete set null,
  resolved_by uuid references profiles(id) on delete set null,
  resolved_at timestamptz,

  created_at timestamptz not null default now()
);

create index idx_discipline_school on discipline_cases(school_id, status);
create index idx_discipline_student on discipline_cases(student_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table discipline_cases enable row level security;

-- KUONA:
--   - staff wa shule wanaona zote
--   - mzazi/mwanafunzi anaona zake tu
create policy discipline_select on discipline_cases for select to authenticated
  using (
    is_super_admin()
    or (is_school_staff() and school_id = auth_school_id())
    or student_id in (select my_student_ids())
  );

-- KUFUNGUA kesi: staff yeyote wa shule (mwalimu anaweza kuripoti)
create policy discipline_insert on discipline_cases for insert to authenticated
  with check ( is_school_staff() and school_id = auth_school_id() );

-- KUBADILISHA (kutoa maamuzi): manager pekee (mkuu/mmiliki)
--   mwalimu anaripoti, lakini maamuzi ni ya mkuu
create policy discipline_update on discipline_cases for update to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

-- KUFUTA: manager pekee
create policy discipline_delete on discipline_cases for delete to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- Function: shughulikia kesi (manager pekee)
-- ------------------------------------------------------------
create or replace function resolve_discipline_case(
  p_case_id uuid,
  p_status text,           -- 'resolved' au 'dismissed'
  p_action text default null,
  p_parent_notified boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
begin
  select school_id into v_school from discipline_cases where id = p_case_id;
  if v_school is null then raise exception 'Kesi haipo'; end if;

  if not (is_super_admin() or (is_school_manager() and v_school = auth_school_id())) then
    raise exception 'Ni mkuu au mmiliki pekee anayeweza kushughulikia kesi';
  end if;

  if p_status not in ('resolved','dismissed') then
    raise exception 'Hali si sahihi';
  end if;

  update discipline_cases
  set status = p_status,
      action_taken = p_action,
      parent_notified = p_parent_notified,
      resolved_by = auth.uid(),
      resolved_at = now()
  where id = p_case_id;
end;
$fn$;

grant execute on function resolve_discipline_case(uuid, text, text, boolean) to authenticated;

-- ------------------------------------------------------------
-- Sasisha head_dashboard kuongeza tahadhari ya nidhamu
-- (kesi zilizo wazi)
-- ------------------------------------------------------------
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
  if not (is_super_admin() or p_school_id = auth_school_id()) then
    raise exception 'Huna ruhusa ya kuona takwimu za shule hii';
  end if;

  select json_build_object(
    'students_total',   (select count(*) from students where school_id = p_school_id and status = 'active'),
    'students_male',    (select count(*) from students where school_id = p_school_id and status = 'active' and gender = 'male'),
    'students_female',  (select count(*) from students where school_id = p_school_id and status = 'active' and gender = 'female'),
    'teachers_total',   (select count(*) from profiles where school_id = p_school_id and role = 'teacher' and is_active),
    'staff_total',      (select count(*) from profiles where school_id = p_school_id and role in ('teacher','school_admin','school_owner') and is_active),
    'classes_total',    (select count(*) from classes where school_id = p_school_id),
    'subjects_total',   (select count(*) from subjects where school_id = p_school_id),
    'present_today',    (select count(*) from attendance where school_id = p_school_id and date = current_date and status = 'present'),
    'absent_today',     (select count(*) from attendance where school_id = p_school_id and date = current_date and status = 'absent'),
    'late_today',       (select count(*) from attendance where school_id = p_school_id and date = current_date and status = 'late'),
    'marked_today',     (select count(*) from attendance where school_id = p_school_id and date = current_date),
    'fees_billed',      (select coalesce(sum(total_amount),0) from fee_invoices where school_id = p_school_id),
    'fees_collected',   (select coalesce(sum(paid_amount),0) from fee_invoices where school_id = p_school_id),
    'fees_month',       (select coalesce(sum(amount),0) from fee_payments where school_id = p_school_id and paid_at >= v_month_start),
    'fees_today',       (select coalesce(sum(amount),0) from fee_payments where school_id = p_school_id and paid_at::date = current_date),
    'debtors_count',    (select count(*) from fee_invoices where school_id = p_school_id and status in ('unpaid','partial')),
    'alert_unpaid',     (select count(*) from fee_invoices where school_id = p_school_id and status in ('unpaid','partial') and due_date < current_date),
    'alert_exams_unpublished', (select count(*) from exams e where e.school_id = p_school_id and not e.is_published and exists (select 1 from results r where r.exam_id = e.id)),
    'alert_no_attendance_today', (select count(*) from classes c where c.school_id = p_school_id and not exists (select 1 from attendance a where a.class_id = c.id and a.date = current_date)),
    'alert_discipline_open', (select count(*) from discipline_cases where school_id = p_school_id and status = 'open'),
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

grant execute on function head_dashboard(uuid) to authenticated;
