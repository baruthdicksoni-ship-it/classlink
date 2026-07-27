-- ============================================================
-- CLASSLINK V3 — AWAMU 2: MKUU AONE ADA (VIEW ONLY)
-- Endesha baada ya 07_head_dashboard.sql
-- ============================================================
-- Mabadiliko: SELECT ya fedha iwe is_school_manager() (owner + mkuu).
-- Kuandika (insert/update/delete) inabaki is_school_owner() —
-- mkuu ANAONA lakini HABADILISHI.
--
-- Hii inaruhusu mkuu:
--   - kuona ankara na malipo yote
--   - kuona takwimu za fedha kwenye dashibodi
--   - kuchapisha ripoti za fedha (awamu 4)
-- Lakini SI:
--   - kutengeneza ankara
--   - kupokea malipo
--   - kubadilisha bei za ada
-- ============================================================

-- ------------------------------------------------------------
-- ANKARA (fee_invoices): SELECT -> manager
-- ------------------------------------------------------------
drop policy if exists invoices_select on fee_invoices;
create policy invoices_select on fee_invoices for select to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())
    or student_id in (select my_student_ids())
  );

-- insert/update/delete zinabaki owner pekee (hatuzigusi — ziko 05)

-- ------------------------------------------------------------
-- MALIPO (fee_payments): SELECT -> manager
-- ------------------------------------------------------------
drop policy if exists payments_select on fee_payments;
create policy payments_select on fee_payments for select to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())
    or student_id in (select my_student_ids())
  );

-- ------------------------------------------------------------
-- MUUNDO WA ADA (fee_structures): SELECT tayari ni school-wide,
-- lakini tuhakikishe manager anaona
-- ------------------------------------------------------------
drop policy if exists fee_structures_select on fee_structures;
create policy fee_structures_select on fee_structures for select to authenticated
  using ( is_super_admin() or school_id = auth_school_id() );
