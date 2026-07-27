-- ============================================================
-- CLASSLINK V3 — MAREKEBISHO: RUHUSA ZA MMILIKI
-- Endesha baada ya 05_owner_rls.sql
-- ============================================================
-- Tatizo: policy nyingi zilitumia is_school_admin() (admin PEKEE),
-- hivyo school_owner alizuiwa kufanya kazi za kawaida za shule
-- (kusajili wanafunzi, madarasa, n.k.).
--
-- Suluhisho: badilisha ziwe is_school_manager() (owner + admin)
-- kwa kazi za usimamizi wa kawaida. Fedha zinabaki kwa owner pekee
-- (hizo ziliwekwa 05_owner_rls.sql — hatuzigusi hapa).
-- ============================================================

-- ------------------------------------------------------------
-- SCHOOLS: owner anaweza kuhariri shule yake
-- ------------------------------------------------------------
drop policy if exists schools_update on schools;
create policy schools_update on schools for update to authenticated
  using ( is_super_admin() or (is_school_manager() and id = auth_school_id()) );

-- ------------------------------------------------------------
-- WANAFUNZI
-- ------------------------------------------------------------
drop policy if exists students_insert on students;
create policy students_insert on students for insert to authenticated
  with check ( is_super_admin() or (is_school_manager() and school_id = auth_school_id()) );

drop policy if exists students_update on students;
create policy students_update on students for update to authenticated
  using ( is_super_admin() or (is_school_manager() and school_id = auth_school_id()) );

drop policy if exists students_delete on students;
create policy students_delete on students for delete to authenticated
  using ( is_super_admin() or (is_school_manager() and school_id = auth_school_id()) );

-- ------------------------------------------------------------
-- WALEZI
-- ------------------------------------------------------------
drop policy if exists guardians_write on guardians;
create policy guardians_write on guardians for insert to authenticated
  with check ( is_super_admin() or (is_school_manager() and school_id = auth_school_id()) );

drop policy if exists guardians_update on guardians;
create policy guardians_update on guardians for update to authenticated
  using ( is_super_admin() or (is_school_manager() and school_id = auth_school_id()) );

drop policy if exists guardians_delete on guardians;
create policy guardians_delete on guardians for delete to authenticated
  using ( is_super_admin() or (is_school_manager() and school_id = auth_school_id()) );

-- ------------------------------------------------------------
-- MADARASA, MASOMO, MIAKA, MIHULA, TEACHING, GRADE_SCALES
-- (zilitengenezwa kwa macro yenye is_school_admin — tunazibadilisha)
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'academic_years','terms','classes','subjects',
    'teaching_assignments','grade_scales'
  ]
  loop
    execute format('drop policy if exists %1$s_write on %1$s', t);
    execute format('drop policy if exists %1$s_update on %1$s', t);
    execute format('drop policy if exists %1$s_delete on %1$s', t);

    execute format($f$
      create policy %1$s_write on %1$s for insert to authenticated
        with check ( is_super_admin() or (is_school_manager() and school_id = auth_school_id()) );
    $f$, t);
    execute format($f$
      create policy %1$s_update on %1$s for update to authenticated
        using ( is_super_admin() or (is_school_manager() and school_id = auth_school_id()) );
    $f$, t);
    execute format($f$
      create policy %1$s_delete on %1$s for delete to authenticated
        using ( is_super_admin() or (is_school_manager() and school_id = auth_school_id()) );
    $f$, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- KUFUTA: mahudhurio, mitihani, matokeo, matangazo
-- (manager anaweza kufuta, si admin pekee)
-- ------------------------------------------------------------
drop policy if exists attendance_delete on attendance;
create policy attendance_delete on attendance for delete to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

drop policy if exists exams_delete on exams;
create policy exams_delete on exams for delete to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

drop policy if exists results_delete on results;
create policy results_delete on results for delete to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

drop policy if exists announcements_delete on announcements;
create policy announcements_delete on announcements for delete to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- PROFILES: tayari zilirekebishwa 05_owner_rls.sql
--   (profiles_insert, profiles_update_admin -> is_school_manager)
--   (profiles_delete -> is_school_owner)
-- Hatuzigusi hapa.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- AUDIT LOGS: manager anaweza kuona
-- ------------------------------------------------------------
drop policy if exists audit_select on audit_logs;
create policy audit_select on audit_logs for select to authenticated
  using ( is_super_admin() or (is_school_manager() and school_id = auth_school_id()) );
