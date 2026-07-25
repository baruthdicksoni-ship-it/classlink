-- ============================================================
-- CLASSLINK V3 — FUNCTIONS, TRIGGERS & SEED
-- ============================================================

-- ------------------------------------------------------------
-- Trigger: tengeneza profile mtumiaji anaposajiliwa
-- ------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_role      text;
begin
  v_school_id := nullif(new.raw_user_meta_data->>'school_id','')::uuid;
  v_role      := coalesce(nullif(new.raw_user_meta_data->>'role',''), 'student');

  -- Ulinzi: role isiyojulikana inarudi 'student'
  if v_role not in ('super_admin','school_admin','teacher','parent','student') then
    v_role := 'student';
  end if;

  -- Kama hakuna shule, mtumiaji huyu ni wa jukwaa (super_admin).
  -- Bila hii, kutengeneza mtumiaji bila metadata kunavunja usajili mzima.
  if v_school_id is null then
    v_role := 'super_admin';
  elsif v_role = 'super_admin' then
    -- super_admin hapaswi kuwa na shule
    v_school_id := null;
  end if;

  insert into profiles (id, school_id, role, full_name, email, phone)
  values (
    new.id,
    v_school_id,
    v_role,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.email,
    nullif(new.raw_user_meta_data->>'phone','')
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- Usajili usivunjike kwa sababu ya profile. Rekodi kosa, endelea.
    raise warning 'handle_new_user imeshindwa kwa % : %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- Trigger: sasisha jumla ya invoice malipo yanapoingia
-- ------------------------------------------------------------

create or replace function recalc_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv_id uuid;
  total numeric(12,2);
  paid  numeric(12,2);
begin
  inv_id := coalesce(new.invoice_id, old.invoice_id);

  select coalesce(sum(amount),0) into paid
  from fee_payments where invoice_id = inv_id;

  select total_amount into total
  from fee_invoices where id = inv_id;

  update fee_invoices
  set paid_amount = paid,
      status = case
        when paid <= 0 then 'unpaid'
        when paid >= total then 'paid'
        else 'partial'
      end
  where id = inv_id;

  return null;
end;
$$;

drop trigger if exists trg_recalc_invoice on fee_payments;
create trigger trg_recalc_invoice
  after insert or update or delete on fee_payments
  for each row execute function recalc_invoice();

-- ------------------------------------------------------------
-- Trigger: updated_at kwenye results
-- ------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_results_touch on results;
create trigger trg_results_touch
  before update on results
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------
-- Function: namba ya usajili inayofuata
-- ------------------------------------------------------------

create or replace function next_admission_no(p_school_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yr text := to_char(now(), 'YYYY');
  n  int;
begin
  -- Chukua SEHEMU YA MFULULIZO pekee (baada ya mwaka), si namba nzima.
  -- Mfano: '2026001' -> '001' -> 1
  select coalesce(
           max(
             nullif(regexp_replace(substring(admission_no from length(yr) + 1), '\D', '', 'g'), '')::bigint
           ),
           0
         ) + 1
  into n
  from students
  where school_id = p_school_id
    and admission_no like yr || '%';

  if n is null or n < 1 then n := 1; end if;

  return yr || lpad(n::text, 4, '0');
end;
$$;

grant execute on function next_admission_no(uuid) to authenticated;

-- ------------------------------------------------------------
-- Function: takwimu za dashboard (call moja badala ya nyingi)
-- ------------------------------------------------------------

create or replace function school_dashboard_stats(p_school_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  -- Hakikisha mwombaji ana ruhusa
  if not (is_super_admin() or p_school_id = auth_school_id()) then
    raise exception 'Huna ruhusa ya kuona takwimu za shule hii';
  end if;

  select json_build_object(
    'students_total',   (select count(*) from students where school_id = p_school_id and status = 'active'),
    'students_male',    (select count(*) from students where school_id = p_school_id and status = 'active' and gender = 'male'),
    'students_female',  (select count(*) from students where school_id = p_school_id and status = 'active' and gender = 'female'),
    'teachers_total',   (select count(*) from profiles where school_id = p_school_id and role = 'teacher' and is_active),
    'classes_total',    (select count(*) from classes where school_id = p_school_id),
    'subjects_total',   (select count(*) from subjects where school_id = p_school_id),
    'present_today',    (select count(*) from attendance where school_id = p_school_id and date = current_date and status = 'present'),
    'absent_today',     (select count(*) from attendance where school_id = p_school_id and date = current_date and status = 'absent'),
    'fees_billed',      (select coalesce(sum(total_amount),0) from fee_invoices where school_id = p_school_id),
    'fees_collected',   (select coalesce(sum(paid_amount),0) from fee_invoices where school_id = p_school_id)
  ) into result;

  return result;
end;
$$;

grant execute on function school_dashboard_stats(uuid) to authenticated;

-- ============================================================
-- SEED — madaraja ya kawaida ya Tanzania
-- ============================================================
-- Tumia baada ya kutengeneza shule; badilisha SCHOOL_ID
--
-- insert into grade_scales (school_id, grade, min_marks, max_marks, points, remarks) values
--   ('SCHOOL_ID','A',75,100,1,'Bora sana'),
--   ('SCHOOL_ID','B',65,74.99,2,'Vizuri sana'),
--   ('SCHOOL_ID','C',45,64.99,3,'Wastani'),
--   ('SCHOOL_ID','D',30,44.99,4,'Hafifu'),
--   ('SCHOOL_ID','F',0,29.99,5,'Amefeli');
