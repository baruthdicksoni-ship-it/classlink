-- ============================================================
-- CLASSLINK V3 — NYONGEZA: RLS KWA ROLES MPYA
-- Endesha baada ya 04_owner_role.sql
-- ============================================================
-- Falsafa:
--   super_admin  -> kila kitu, shule zote
--   school_owner -> kila kitu ndani ya shule yake (pamoja na fedha na wakuu)
--   school_admin -> taaluma, wanafunzi, walimu (SI kufuta owner)
--   teacher      -> kusoma + mahudhurio + matokeo
--   parent/student -> kusoma taarifa zao
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES: manager (owner/admin) anaweza kutengeneza & kuhariri
-- ------------------------------------------------------------
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert to authenticated
  with check (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())
  );

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles for update to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())
  );

-- Kufuta profile: super_admin, au owner (admin haruhusiwi kufuta watu)
drop policy if exists profiles_delete on profiles;
create policy profiles_delete on profiles for delete to authenticated
  using (
    is_super_admin()
    or (is_school_owner() and school_id = auth_school_id())
  );

-- ------------------------------------------------------------
-- FEDHA: owner pekee (pamoja na super_admin). Admin haoni fedha.
-- ------------------------------------------------------------

-- Ankara
drop policy if exists invoices_select on fee_invoices;
create policy invoices_select on fee_invoices for select to authenticated
  using (
    is_super_admin()
    or (is_school_owner() and school_id = auth_school_id())
    or student_id in (select my_student_ids())
  );

drop policy if exists invoices_write on fee_invoices;
create policy invoices_write on fee_invoices for insert to authenticated
  with check ( is_school_owner() and school_id = auth_school_id() );

drop policy if exists invoices_update on fee_invoices;
create policy invoices_update on fee_invoices for update to authenticated
  using ( is_school_owner() and school_id = auth_school_id() );

drop policy if exists invoices_delete on fee_invoices;
create policy invoices_delete on fee_invoices for delete to authenticated
  using ( is_school_owner() and school_id = auth_school_id() );

-- Malipo
drop policy if exists payments_select on fee_payments;
create policy payments_select on fee_payments for select to authenticated
  using (
    is_super_admin()
    or (is_school_owner() and school_id = auth_school_id())
    or student_id in (select my_student_ids())
  );

drop policy if exists payments_write on fee_payments;
create policy payments_write on fee_payments for insert to authenticated
  with check ( is_school_owner() and school_id = auth_school_id() );

drop policy if exists payments_update on fee_payments;
create policy payments_update on fee_payments for update to authenticated
  using ( is_school_owner() and school_id = auth_school_id() );

drop policy if exists payments_delete on fee_payments;
create policy payments_delete on fee_payments for delete to authenticated
  using ( is_school_owner() and school_id = auth_school_id() );

-- fee_structures: owner pekee kuandika
drop policy if exists fee_structures_write on fee_structures;
create policy fee_structures_write on fee_structures for insert to authenticated
  with check ( is_super_admin() or (is_school_owner() and school_id = auth_school_id()) );

drop policy if exists fee_structures_update on fee_structures;
create policy fee_structures_update on fee_structures for update to authenticated
  using ( is_super_admin() or (is_school_owner() and school_id = auth_school_id()) );

drop policy if exists fee_structures_delete on fee_structures;
create policy fee_structures_delete on fee_structures for delete to authenticated
  using ( is_super_admin() or (is_school_owner() and school_id = auth_school_id()) );
