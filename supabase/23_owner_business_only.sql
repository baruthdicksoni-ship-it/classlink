-- ============================================================
-- CLASSLINK V3 — MMILIKI: MFANYABIASHARA (SI KAZI ZA KILA SIKU)
-- Endesha baada ya 22_owner_dashboard.sql
-- ============================================================
-- Lengo: Mmiliki AONE kila kitu + asimamie (watumiaji, settings,
--   ripoti, subscription, audit) + kibali cha dharura (kufuta
--   wanafunzi/walimu). LAKINI ASIFANYE kazi za kila siku:
--   mahudhurio, matokeo, mitihani, ratiba, madarasa, masomo,
--   nidhamu, kalenda, vifaa, muundo wa ada, likizo.
--
-- Mkakati: helper mpya is_daily_ops() = mkuu + academic_master
--   (BILA mmiliki). Kazi za kila siku zibadilishwe kutumia hii.
--   Settings, watumiaji, nyaraka, dharura HAZIGUSWI (mmiliki abaki).
-- ============================================================

-- ------------------------------------------------------------
-- Helper: wanaofanya kazi za kila siku (mkuu + academic master)
--   — mmiliki HAMO
-- ------------------------------------------------------------
create or replace function is_daily_ops()
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select coalesce(
    (select role in ('school_admin','academic_master')
     from profiles where id = auth.uid()),
    false
  );
$fn$;

grant execute on function is_daily_ops() to authenticated;

-- ============================================================
-- KUBADILISHA RLS ZA KAZI ZA KILA SIKU
-- (kutoka is_school_manager -> is_daily_ops, ili mmiliki azuiwe)
-- ============================================================

-- --- MADARASA, MASOMO, n.k. (loop ya 06 ilitumia <t>_write kwa is_school_manager) ---
-- Ondoa za zamani, tengeneza upya kwa is_daily_ops (bila mmiliki).
-- academic_years & terms ZIMEACHWA (ni settings — mmiliki abaki nazo).
do $blk$
declare t text;
begin
  foreach t in array array['classes','subjects','teaching_assignments','grade_scales']
  loop
    execute format('drop policy if exists %1$s_write on %1$s', t);
    execute format('drop policy if exists %1$s_update on %1$s', t);
    execute format('drop policy if exists %1$s_delete on %1$s', t);
    execute format('drop policy if exists %1$s_insert on %1$s', t);

    execute format($f$
      create policy %1$s_write on %1$s for insert to authenticated
        with check ( is_super_admin() or (is_daily_ops() and school_id = auth_school_id()) );
    $f$, t);
    execute format($f$
      create policy %1$s_update on %1$s for update to authenticated
        using ( is_super_admin() or (is_daily_ops() and school_id = auth_school_id()) );
    $f$, t);
    execute format($f$
      create policy %1$s_delete on %1$s for delete to authenticated
        using ( is_super_admin() or (is_daily_ops() and school_id = auth_school_id()) );
    $f$, t);
  end loop;
end $blk$;

-- --- MAHUDHURIO (record/edit/delete) ---
drop policy if exists attendance_delete on attendance;
create policy attendance_delete on attendance for delete to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );

-- --- MITIHANI / MATOKEO (delete) ---
drop policy if exists exams_delete on exams;
create policy exams_delete on exams for delete to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists results_delete on results;
create policy results_delete on results for delete to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );

-- --- NIDHAMU ---
drop policy if exists discipline_update on discipline_cases;
create policy discipline_update on discipline_cases for update to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists discipline_delete on discipline_cases;
create policy discipline_delete on discipline_cases for delete to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );

-- --- RATIBA ---
drop policy if exists timetable_insert on timetable_slots;
create policy timetable_insert on timetable_slots for insert to authenticated
  with check ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists timetable_update on timetable_slots;
create policy timetable_update on timetable_slots for update to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists timetable_delete on timetable_slots;
create policy timetable_delete on timetable_slots for delete to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );

-- --- KALENDA ---
drop policy if exists calendar_insert on calendar_events;
create policy calendar_insert on calendar_events for insert to authenticated
  with check ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists calendar_update on calendar_events;
create policy calendar_update on calendar_events for update to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists calendar_delete on calendar_events;
create policy calendar_delete on calendar_events for delete to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );

-- --- VIFAA (inventory) ---
drop policy if exists inventory_insert on inventory_items;
create policy inventory_insert on inventory_items for insert to authenticated
  with check ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists inventory_update on inventory_items;
create policy inventory_update on inventory_items for update to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists inventory_delete on inventory_items;
create policy inventory_delete on inventory_items for delete to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists stock_insert on stock_movements;
create policy stock_insert on stock_movements for insert to authenticated
  with check ( is_daily_ops() and school_id = auth_school_id() );

-- --- HR / WAFANYAKAZI (staff records) ---
drop policy if exists staff_records_insert on staff_records;
create policy staff_records_insert on staff_records for insert to authenticated
  with check ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists staff_records_update on staff_records;
create policy staff_records_update on staff_records for update to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );
drop policy if exists staff_records_delete on staff_records;
create policy staff_records_delete on staff_records for delete to authenticated
  using ( is_daily_ops() and school_id = auth_school_id() );

-- ============================================================
-- SETTINGS: mmiliki ABAKI. Badilisha kutoka is_school_manager
--   kuwa (is_school_owner OR is_daily_ops) ili wote wawili wabaki
--   kisha mmiliki asiondolewe settings.
-- ============================================================
create or replace function set_current_year(p_year_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_school uuid;
begin
  select school_id into v_school from academic_years where id = p_year_id;
  if v_school is null then raise exception 'Mwaka haupo'; end if;
  if not (is_super_admin() or ((is_school_owner() or is_daily_ops()) and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa ya kubadili mwaka wa masomo';
  end if;
  update academic_years set is_current = false where school_id = v_school;
  update academic_years set is_current = true where id = p_year_id;
end;
$fn$;

create or replace function set_current_term(p_term_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_school uuid;
begin
  select school_id into v_school from terms where id = p_term_id;
  if v_school is null then raise exception 'Muhula haupo'; end if;
  if not (is_super_admin() or ((is_school_owner() or is_daily_ops()) and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa ya kubadili muhula';
  end if;
  update terms set is_current = false where school_id = v_school;
  update terms set is_current = true where id = p_term_id;
end;
$fn$;

create or replace function set_term_status(p_term_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_school uuid;
begin
  if p_status not in ('open','closed') then raise exception 'Hali si sahihi'; end if;
  select school_id into v_school from terms where id = p_term_id;
  if v_school is null then raise exception 'Muhula haupo'; end if;
  if not (is_super_admin() or ((is_school_owner() or is_daily_ops()) and v_school = auth_school_id())) then
    raise exception 'Huna ruhusa';
  end if;
  update terms set status = p_status where id = p_term_id;
end;
$fn$;

-- ============================================================
-- MAHUDHURIO / MITIHANI / MATOKEO: insert+update zilitumia
--   is_school_staff() (inayojumuisha mmiliki). Ondoa mmiliki:
--   waandishi ni mwalimu + daily_ops, si mmiliki.
-- ============================================================
-- Mahudhurio: mwalimu wa darasa + daily_ops
drop policy if exists attendance_insert on attendance;
create policy attendance_insert on attendance for insert to authenticated
  with check ( (is_daily_ops() or auth_role() in ('teacher','staff')) and school_id = auth_school_id() );
drop policy if exists attendance_update on attendance;
create policy attendance_update on attendance for update to authenticated
  using ( (is_daily_ops() or auth_role() in ('teacher','staff')) and school_id = auth_school_id() );

-- Mitihani: mwalimu + daily_ops (si mmiliki)
drop policy if exists exams_insert on exams;
create policy exams_insert on exams for insert to authenticated
  with check ( (is_daily_ops() or auth_role() = 'teacher') and school_id = auth_school_id() );
drop policy if exists exams_update on exams;
create policy exams_update on exams for update to authenticated
  using ( (is_daily_ops() or auth_role() = 'teacher') and school_id = auth_school_id() );

-- Matokeo: mwalimu + daily_ops (si mmiliki)
drop policy if exists results_insert on results;
create policy results_insert on results for insert to authenticated
  with check ( (is_daily_ops() or auth_role() = 'teacher') and school_id = auth_school_id() );
drop policy if exists results_update on results;
create policy results_update on results for update to authenticated
  using ( (is_daily_ops() or auth_role() = 'teacher') and school_id = auth_school_id() );

-- ============================================================
-- MUUNDO WA ADA: mmiliki HAGUSI (ni ya mhasibu/mkuu).
--   fee_structures_write/update/delete (05/19) zilitumia
--   can_manage_fees (owner+accountant). Ondoa mmiliki.
-- ============================================================
drop policy if exists fee_structures_write on fee_structures;
create policy fee_structures_write on fee_structures for insert to authenticated
  with check ( (is_daily_ops() or auth_role() = 'accountant') and school_id = auth_school_id() );
drop policy if exists fee_structures_update on fee_structures;
create policy fee_structures_update on fee_structures for update to authenticated
  using ( (is_daily_ops() or auth_role() = 'accountant') and school_id = auth_school_id() );
drop policy if exists fee_structures_delete on fee_structures;
create policy fee_structures_delete on fee_structures for delete to authenticated
  using ( (is_daily_ops() or auth_role() = 'accountant') and school_id = auth_school_id() );
