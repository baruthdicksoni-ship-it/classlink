-- ============================================================
-- CLASSLINK V3 — DASHIBODI YA KIBIASHARA YA MMILIKI
-- Endesha baada ya 21_academic_master.sql
-- ============================================================
-- Mmiliki anajali picha ya biashara: faida, ada dhidi ya matumizi,
-- ukuaji, na muhtasari wa fedha. Mmiliki pekee (is_school_owner).
-- ============================================================

create or replace function owner_dashboard(p_school_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
  v_month_start date := date_trunc('month', current_date)::date;
  v_year_start  date := date_trunc('year', current_date)::date;
begin
  -- Mmiliki pekee (au super admin)
  if not (is_super_admin() or (is_school_owner() and p_school_id = auth_school_id())) then
    raise exception 'Ni mmiliki pekee anayeweza kuona dashibodi ya kibiashara';
  end if;

  select json_build_object(
    -- ===== FEDHA: mwezi huu =====
    'income_month',   (select coalesce(sum(amount),0) from fee_payments where school_id = p_school_id and paid_at >= v_month_start),
    'expenses_month', (select coalesce(sum(amount),0) from expenses where school_id = p_school_id and expense_date >= v_month_start),

    -- ===== FEDHA: mwaka huu =====
    'income_year',    (select coalesce(sum(amount),0) from fee_payments where school_id = p_school_id and paid_at >= v_year_start),
    'expenses_year',  (select coalesce(sum(amount),0) from expenses where school_id = p_school_id and expense_date >= v_year_start),

    -- ===== ADA: jumla =====
    'fees_billed',    (select coalesce(sum(total_amount),0) from fee_invoices where school_id = p_school_id),
    'fees_collected', (select coalesce(sum(paid_amount),0) from fee_invoices where school_id = p_school_id),
    'fees_outstanding', (select coalesce(sum(total_amount - paid_amount),0) from fee_invoices where school_id = p_school_id and status in ('unpaid','partial')),
    'debtors_count',  (select count(*) from fee_invoices where school_id = p_school_id and status in ('unpaid','partial')),

    -- Kiwango cha ukusanyaji (%)
    'collection_rate', (
      select case when coalesce(sum(total_amount),0) > 0
        then round(100.0 * coalesce(sum(paid_amount),0) / sum(total_amount))
        else 0 end
      from fee_invoices where school_id = p_school_id
    ),

    -- ===== WATU =====
    'students_total', (select count(*) from students where school_id = p_school_id and status = 'active'),
    'staff_total',    (select count(*) from profiles where school_id = p_school_id
                        and role in ('school_admin','academic_master','teacher','accountant','staff') and is_active),

    -- ===== UKUAJI: wanafunzi wapya kwa mwezi (miezi 6) =====
    'enrollment_trend', (
      select coalesce(json_agg(row_to_json(t) order by t.m), '[]'::json)
      from (
        select to_char(d, 'Mon') as month_label, date_trunc('month', d)::date as m,
          (select count(*) from students s
           where s.school_id = p_school_id
             and date_trunc('month', s.admission_date) = date_trunc('month', d)) as wapya
        from generate_series(v_month_start - interval '5 months', v_month_start, '1 month') d
      ) t
    ),

    -- ===== MAPATO DHIDI YA MATUMIZI (miezi 6) =====
    'finance_trend', (
      select coalesce(json_agg(row_to_json(t) order by t.m), '[]'::json)
      from (
        select to_char(d, 'Mon') as month_label, date_trunc('month', d)::date as m,
          (select coalesce(sum(amount),0) from fee_payments p
           where p.school_id = p_school_id
             and date_trunc('month', p.paid_at) = date_trunc('month', d)) as mapato,
          (select coalesce(sum(amount),0) from expenses e
           where e.school_id = p_school_id
             and date_trunc('month', e.expense_date) = date_trunc('month', d)) as matumizi
        from generate_series(v_month_start - interval '5 months', v_month_start, '1 month') d
      ) t
    )
  ) into result;

  return result;
end;
$fn$;

grant execute on function owner_dashboard(uuid) to authenticated;
