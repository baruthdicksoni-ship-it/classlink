-- ============================================================
-- CLASSLINK V3 — AWAMU 10: INVENTORY (VIFAA VYA SHULE)
-- Endesha baada ya 14_hr.sql
-- ============================================================
-- Sehemu mbili:
--   inventory_items    — vifaa (jina, kategoria, kiasi, kiwango cha chini)
--   stock_movements    — mienendo (kuingiza/kutoa) kwa historia
-- Tahadhari ya stock ndogo inaunganishwa kwenye head_dashboard.
-- ============================================================

create table inventory_items (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,

  name text not null,
  category text not null default 'other' check (category in (
    'stationery','furniture','electronics','cleaning','sports','lab','kitchen','books','other'
  )),
  unit text default 'kipande',        -- kipimo: kipande, box, kg, lita, n.k.
  quantity numeric(12,2) not null default 0,
  min_quantity numeric(12,2) not null default 0,   -- kiwango cha chini (tahadhari)
  location text,                       -- mahali kilipo (ghala, darasa, n.k.)
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_inventory_school on inventory_items(school_id);

create table stock_movements (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  item_id uuid not null references inventory_items(id) on delete cascade,

  movement_type text not null check (movement_type in ('in','out')),
  quantity numeric(12,2) not null check (quantity > 0),
  reason text,                         -- sababu: manunuzi, matumizi, uharibifu
  moved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_stock_item on stock_movements(item_id, created_at);

-- ============================================================
-- RLS
-- ============================================================
alter table inventory_items enable row level security;
alter table stock_movements enable row level security;

-- KUONA: staff wote wa shule
create policy inventory_select on inventory_items for select to authenticated
  using ( is_super_admin() or (is_school_staff() and school_id = auth_school_id()) );

-- KUANDIKA: manager pekee
create policy inventory_insert on inventory_items for insert to authenticated
  with check ( is_school_manager() and school_id = auth_school_id() );
create policy inventory_update on inventory_items for update to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );
create policy inventory_delete on inventory_items for delete to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

-- Mienendo: staff wanaona; manager anaandika
create policy stock_select on stock_movements for select to authenticated
  using ( is_super_admin() or (is_school_staff() and school_id = auth_school_id()) );
create policy stock_insert on stock_movements for insert to authenticated
  with check ( is_school_manager() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- Trigger: kila mwendo unasasisha kiasi cha kifaa
-- ------------------------------------------------------------
create or replace function apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.movement_type = 'in' then
    update inventory_items set quantity = quantity + new.quantity, updated_at = now()
    where id = new.item_id;
  else
    update inventory_items set quantity = greatest(quantity - new.quantity, 0), updated_at = now()
    where id = new.item_id;
  end if;
  return new;
end;
$fn$;

create trigger trg_apply_stock after insert on stock_movements
  for each row execute function apply_stock_movement();

create trigger touch_inventory before update on inventory_items
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------
-- Sasisha head_dashboard: ongeza tahadhari ya stock ndogo
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
    'staff_total',      (select count(*) from profiles where school_id = p_school_id and role in ('teacher','school_admin','school_owner','staff') and is_active),
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
    'alert_low_stock',  (select count(*) from inventory_items where school_id = p_school_id and quantity <= min_quantity and min_quantity > 0),
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
