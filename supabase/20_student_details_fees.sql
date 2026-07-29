-- ============================================================
-- CLASSLINK V3 — TAARIFA KAMILI ZA MWANAFUNZI + ADA KWA DARASA
-- Endesha baada ya 19_accountant.sql
-- ============================================================
-- Sehemu tatu:
--   1. Safu mpya za taarifa kamili kwenye 'students'
--   2. Function ya kutengeneza ankara kutoka muundo wa ada wa darasa
--   3. (fee_structures tayari lipo — hakuna mabadiliko)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Taarifa kamili za mwanafunzi
-- ------------------------------------------------------------
alter table students add column if not exists place_of_birth text;
alter table students add column if not exists nationality text default 'Mtanzania';
alter table students add column if not exists religion text;
alter table students add column if not exists blood_group text;
alter table students add column if not exists special_needs text;         -- mahitaji maalum
alter table students add column if not exists previous_school text;

-- Mlezi wa pili
alter table students add column if not exists guardian2_name text;
alter table students add column if not exists guardian2_phone text;
alter table students add column if not exists guardian2_relation text;

-- Mawasiliano ya ziada
alter table students add column if not exists guardian_email text;

-- Mtu wa dharura (emergency contact)
alter table students add column if not exists emergency_name text;
alter table students add column if not exists emergency_phone text;

-- ------------------------------------------------------------
-- 2. Tengeneza ankara kutoka muundo wa ada wa darasa
-- ------------------------------------------------------------
-- Inachukua mwanafunzi, inatafuta muundo wa ada wa darasa lake
-- kwa muhula/mwaka husika, kisha inatengeneza ankara.
-- Mmiliki/mhasibu pekee (can_manage_fees).
-- ------------------------------------------------------------
create or replace function generate_invoice_for_student(
  p_student_id uuid,
  p_term_id uuid default null,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
  v_class uuid;
  v_year uuid;
  v_total numeric(12,2);
  v_invoice_id uuid;
  v_invoice_no text;
  v_count int;
begin
  select school_id, class_id into v_school, v_class
  from students where id = p_student_id;

  if v_school is null then raise exception 'Mwanafunzi hapatikani'; end if;

  if not (is_super_admin() or (can_manage_fees() and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa ya kutengeneza ankara';
  end if;

  if v_class is null then raise exception 'Mwanafunzi hana darasa. Mpangie darasa kwanza.'; end if;

  -- Mwaka unaotumika
  select id into v_year from academic_years where school_id = v_school and is_current limit 1;

  -- Jumla ya ada za darasa hili (muundo wa ada)
  select coalesce(sum(amount), 0) into v_total
  from fee_structures
  where school_id = v_school and class_id = v_class
    and (academic_year_id = v_year or academic_year_id is null);

  if v_total = 0 then
    raise exception 'Hakuna muundo wa ada kwa darasa hili. Weka ada ya darasa kwanza.';
  end if;

  -- Namba ya ankara: INV-<mwaka>-<namba>
  select count(*) + 1 into v_count from fee_invoices where school_id = v_school;
  v_invoice_no := 'INV-' || to_char(current_date, 'YYYY') || '-' || lpad(v_count::text, 4, '0');

  insert into fee_invoices (school_id, student_id, term_id, invoice_no, total_amount, due_date, status)
  values (v_school, p_student_id, coalesce(p_term_id, (select id from terms where school_id = v_school and is_current limit 1)),
          v_invoice_no, v_total, p_due_date, 'unpaid')
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$fn$;

grant execute on function generate_invoice_for_student(uuid, uuid, date) to authenticated;

-- ------------------------------------------------------------
-- 3. Tengeneza ankara kwa darasa zima kwa mara moja
-- ------------------------------------------------------------
create or replace function generate_invoices_for_class(
  p_class_id uuid,
  p_term_id uuid default null,
  p_due_date date default null
)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
  v_student record;
  v_made int := 0;
begin
  select school_id into v_school from classes where id = p_class_id;
  if v_school is null then raise exception 'Darasa halipatikani'; end if;

  if not (is_super_admin() or (can_manage_fees() and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa';
  end if;

  for v_student in
    select id from students where class_id = p_class_id and status = 'active'
  loop
    begin
      perform generate_invoice_for_student(v_student.id, p_term_id, p_due_date);
      v_made := v_made + 1;
    exception when others then
      -- Ruka mwanafunzi mwenye tatizo (mfano tayari ana ankara), endelea
      null;
    end;
  end loop;

  return v_made;
end;
$fn$;

grant execute on function generate_invoices_for_class(uuid, uuid, date) to authenticated;

-- ------------------------------------------------------------
-- 4. Mhasibu aone wanafunzi (anahitaji kwa ankara/ada)
-- ------------------------------------------------------------
drop policy if exists students_select on students;
create policy students_select on students for select to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())   -- mkuu/mmiliki: wote
    or (can_manage_fees() and school_id = auth_school_id())     -- mhasibu: wote (kwa ada)
    or (
      auth_role() in ('teacher','staff')                        -- mwalimu/staff: wa madarasa yao
      and school_id = auth_school_id()
      and class_id in (select my_class_ids())
    )
    or id in (select my_student_ids())                          -- mzazi/mwanafunzi: wao
  );

-- ------------------------------------------------------------
-- 5. Zuia ankara mbili: mwanafunzi asipewe ankara mara mbili
--    kwa muhula uleule
-- ------------------------------------------------------------
create or replace function generate_invoice_for_student(
  p_student_id uuid,
  p_term_id uuid default null,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
  v_class uuid;
  v_year uuid;
  v_term uuid;
  v_total numeric(12,2);
  v_invoice_id uuid;
  v_invoice_no text;
  v_count int;
begin
  select school_id, class_id into v_school, v_class
  from students where id = p_student_id;

  if v_school is null then raise exception 'Mwanafunzi hapatikani'; end if;

  if not (is_super_admin() or (can_manage_fees() and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa ya kutengeneza ankara';
  end if;

  if v_class is null then raise exception 'Mwanafunzi hana darasa. Mpangie darasa kwanza.'; end if;

  v_term := coalesce(p_term_id, (select id from terms where school_id = v_school and is_current limit 1));

  -- Zuia marudio: kama tayari ana ankara kwa muhula huu, usiongeze
  if v_term is not null and exists (
    select 1 from fee_invoices
    where student_id = p_student_id and term_id = v_term
  ) then
    raise exception 'Mwanafunzi tayari ana ankara kwa muhula huu';
  end if;

  select id into v_year from academic_years where school_id = v_school and is_current limit 1;

  select coalesce(sum(amount), 0) into v_total
  from fee_structures
  where school_id = v_school and class_id = v_class
    and (academic_year_id = v_year or academic_year_id is null);

  if v_total = 0 then
    raise exception 'Hakuna muundo wa ada kwa darasa hili. Weka ada ya darasa kwanza.';
  end if;

  select count(*) + 1 into v_count from fee_invoices where school_id = v_school;
  v_invoice_no := 'INV-' || to_char(current_date, 'YYYY') || '-' || lpad(v_count::text, 4, '0');

  insert into fee_invoices (school_id, student_id, term_id, invoice_no, total_amount, due_date, status)
  values (v_school, p_student_id, v_term, v_invoice_no, v_total, p_due_date, 'unpaid')
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$fn$;

grant execute on function generate_invoice_for_student(uuid, uuid, date) to authenticated;
