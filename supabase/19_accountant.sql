-- ============================================================
-- CLASSLINK V3 — AKAUNTI YA MHASIBU (ACCOUNTANT)
-- Endesha baada ya 18_teacher.sql
-- ============================================================
-- Sehemu nne:
--   1. Cheo kipya 'accountant'
--   2. Helper can_manage_fees() (mmiliki + mhasibu)
--   3. Kubadilisha RLS ya fedha kuruhusu mhasibu
--   4. Jedwali jipya 'expenses' (matumizi ya shule)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ongeza cheo 'accountant'
-- ------------------------------------------------------------
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('super_admin','school_owner','school_admin','teacher','accountant','staff','parent','student'));

-- Mhasibu ni staff wa shule (aone ratiba, kalenda, n.k. kama staff)
create or replace function is_school_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select role in ('school_owner','school_admin','teacher','accountant','staff')
  from profiles where id = auth.uid();
$fn$;

-- ------------------------------------------------------------
-- 2. Helper: nani anaweza kusimamia fedha (mmiliki au mhasibu)
-- ------------------------------------------------------------
create or replace function can_manage_fees()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select role in ('school_owner','accountant')
  from profiles where id = auth.uid();
$fn$;

grant execute on function can_manage_fees() to authenticated;

-- ------------------------------------------------------------
-- 3. Kubadilisha RLS ya fedha: mhasibu apate ruhusa kamili
-- ------------------------------------------------------------

-- ANKARA (fee_invoices)
drop policy if exists invoices_select on fee_invoices;
create policy invoices_select on fee_invoices for select to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())   -- mkuu anaona (view)
    or (can_manage_fees() and school_id = auth_school_id())     -- mhasibu/mmiliki
    or student_id in (select my_student_ids())
  );

drop policy if exists invoices_insert on fee_invoices;
create policy invoices_insert on fee_invoices for insert to authenticated
  with check ( can_manage_fees() and school_id = auth_school_id() );

drop policy if exists invoices_update on fee_invoices;
create policy invoices_update on fee_invoices for update to authenticated
  using ( can_manage_fees() and school_id = auth_school_id() );

drop policy if exists invoices_delete on fee_invoices;
create policy invoices_delete on fee_invoices for delete to authenticated
  using ( can_manage_fees() and school_id = auth_school_id() );

-- MALIPO (fee_payments)
drop policy if exists payments_select on fee_payments;
create policy payments_select on fee_payments for select to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())
    or (can_manage_fees() and school_id = auth_school_id())
    or student_id in (select my_student_ids())
  );

drop policy if exists payments_insert on fee_payments;
create policy payments_insert on fee_payments for insert to authenticated
  with check ( can_manage_fees() and school_id = auth_school_id() );

drop policy if exists payments_update on fee_payments;
create policy payments_update on fee_payments for update to authenticated
  using ( can_manage_fees() and school_id = auth_school_id() );

drop policy if exists payments_delete on fee_payments;
create policy payments_delete on fee_payments for delete to authenticated
  using ( can_manage_fees() and school_id = auth_school_id() );

-- MUUNDO WA ADA (fee_structures)
drop policy if exists fee_structures_write on fee_structures;
create policy fee_structures_write on fee_structures for insert to authenticated
  with check ( can_manage_fees() and school_id = auth_school_id() );
drop policy if exists fee_structures_update on fee_structures;
create policy fee_structures_update on fee_structures for update to authenticated
  using ( can_manage_fees() and school_id = auth_school_id() );
drop policy if exists fee_structures_delete on fee_structures;
create policy fee_structures_delete on fee_structures for delete to authenticated
  using ( can_manage_fees() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- 4. Jedwali jipya: expenses (matumizi ya shule)
-- ------------------------------------------------------------
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,

  title text not null,
  category text not null default 'other' check (category in (
    'salary','utilities','supplies','maintenance','transport','food','rent','other'
  )),
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  payment_method text default 'cash' check (payment_method in ('cash','bank','mpesa','tigopesa','airtel','other')),
  payee text,                         -- aliyelipwa
  reference text,                     -- namba ya risiti/rejea
  notes text,

  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_expenses_school on expenses(school_id, expense_date);

alter table expenses enable row level security;

-- KUONA/KUANDIKA: mmiliki, mhasibu, mkuu (mkuu aone tu)
create policy expenses_select on expenses for select to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())
    or (can_manage_fees() and school_id = auth_school_id())
  );

create policy expenses_insert on expenses for insert to authenticated
  with check ( can_manage_fees() and school_id = auth_school_id() );

create policy expenses_update on expenses for update to authenticated
  using ( can_manage_fees() and school_id = auth_school_id() );

create policy expenses_delete on expenses for delete to authenticated
  using ( can_manage_fees() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- 5. Dashibodi ya mhasibu — takwimu za fedha
-- ------------------------------------------------------------
create or replace function accountant_dashboard(p_school_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
  v_month_start date := date_trunc('month', current_date)::date;
begin
  if not (
    is_super_admin()
    or ((can_manage_fees() or is_school_manager()) and p_school_id = auth_school_id())
  ) then
    raise exception 'Huna ruhusa ya kuona takwimu za fedha';
  end if;

  select json_build_object(
    'fees_billed',      (select coalesce(sum(total_amount),0) from fee_invoices where school_id = p_school_id),
    'fees_collected',   (select coalesce(sum(paid_amount),0) from fee_invoices where school_id = p_school_id),
    'fees_balance',     (select coalesce(sum(total_amount - paid_amount),0) from fee_invoices where school_id = p_school_id),
    'collected_today',  (select coalesce(sum(amount),0) from fee_payments where school_id = p_school_id and paid_at::date = current_date),
    'collected_month',  (select coalesce(sum(amount),0) from fee_payments where school_id = p_school_id and paid_at >= v_month_start),
    'expenses_month',   (select coalesce(sum(amount),0) from expenses where school_id = p_school_id and expense_date >= v_month_start),
    'expenses_total',   (select coalesce(sum(amount),0) from expenses where school_id = p_school_id),
    'debtors_count',    (select count(*) from fee_invoices where school_id = p_school_id and status in ('unpaid','partial')),
    'net_month',        (
      (select coalesce(sum(amount),0) from fee_payments where school_id = p_school_id and paid_at >= v_month_start)
      - (select coalesce(sum(amount),0) from expenses where school_id = p_school_id and expense_date >= v_month_start)
    ),
    -- Mwenendo wa mapato vs matumizi: miezi 6 iliyopita
    'trend', (
      select coalesce(json_agg(row_to_json(t) order by t.m), '[]'::json)
      from (
        select
          to_char(d, 'Mon') as month_label,
          date_trunc('month', d)::date as m,
          (select coalesce(sum(amount),0) from fee_payments
           where school_id = p_school_id and date_trunc('month', paid_at) = date_trunc('month', d)) as income,
          (select coalesce(sum(amount),0) from expenses
           where school_id = p_school_id and date_trunc('month', expense_date) = date_trunc('month', d)) as expense
        from generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), '1 month') d
      ) t
    )
  ) into result;

  return result;
end;
$fn$;

grant execute on function accountant_dashboard(uuid) to authenticated;
