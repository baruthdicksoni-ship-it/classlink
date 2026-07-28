-- ============================================================
-- CLASSLINK V3 — AWAMU 12: SETTINGS ZA MKUU
-- Endesha baada ya 16_documents.sql (na 16b storage)
-- ============================================================
-- Sehemu tatu:
--   1. Ongeza 'status' kwenye terms (open/closed)
--   2. Functions za kuweka mwaka/muhula unaotumika (current)
--   3. Function ya kufungua/kufunga muhula
-- Vyote ni manager pekee (mkuu/mmiliki).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ongeza status kwenye terms
-- ------------------------------------------------------------
alter table terms add column if not exists status text not null default 'open'
  check (status in ('open','closed'));

-- ------------------------------------------------------------
-- 2. Weka mwaka wa masomo unaotumika
--    (huweka is_current=true kwa mmoja, false kwa wengine)
-- ------------------------------------------------------------
create or replace function set_current_year(p_year_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
begin
  select school_id into v_school from academic_years where id = p_year_id;
  if v_school is null then raise exception 'Mwaka haupo'; end if;

  if not (is_super_admin() or (is_school_manager() and v_school = auth_school_id())) then
    raise exception 'Ni mkuu au mmiliki pekee anayeweza kubadili mwaka wa masomo';
  end if;

  update academic_years set is_current = (id = p_year_id)
  where school_id = v_school;
end;
$fn$;

-- ------------------------------------------------------------
-- Weka muhula unaotumika
-- ------------------------------------------------------------
create or replace function set_current_term(p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
begin
  select school_id into v_school from terms where id = p_term_id;
  if v_school is null then raise exception 'Muhula haupo'; end if;

  if not (is_super_admin() or (is_school_manager() and v_school = auth_school_id())) then
    raise exception 'Ni mkuu au mmiliki pekee anayeweza kubadili muhula';
  end if;

  update terms set is_current = (id = p_term_id)
  where school_id = v_school;
end;
$fn$;

-- ------------------------------------------------------------
-- 3. Fungua/funga muhula
-- ------------------------------------------------------------
create or replace function set_term_status(p_term_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
begin
  select school_id into v_school from terms where id = p_term_id;
  if v_school is null then raise exception 'Muhula haupo'; end if;

  if not (is_super_admin() or (is_school_manager() and v_school = auth_school_id())) then
    raise exception 'Ni mkuu au mmiliki pekee anayeweza kufungua/kufunga muhula';
  end if;

  if p_status not in ('open','closed') then
    raise exception 'Hali si sahihi';
  end if;

  update terms set status = p_status where id = p_term_id;
end;
$fn$;

grant execute on function set_current_year(uuid) to authenticated;
grant execute on function set_current_term(uuid) to authenticated;
grant execute on function set_term_status(uuid, text) to authenticated;
