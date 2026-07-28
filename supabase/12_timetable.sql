-- ============================================================
-- CLASSLINK V3 — AWAMU 6: RATIBA (TIMETABLE)
-- Endesha baada ya 11_discipline.sql
-- ============================================================
-- Jedwali jipya: timetable_slots
-- Kila slot: darasa + siku + kipindi + somo + mwalimu (hiari)
-- ============================================================

create table timetable_slots (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,

  -- Wakati
  day_of_week smallint not null check (day_of_week between 1 and 7),  -- 1=Jumatatu ... 7=Jumapili
  start_time time not null,
  end_time time not null,

  -- Kinachofundishwa
  subject_id uuid references subjects(id) on delete set null,
  teacher_id uuid references profiles(id) on delete set null,
  room text,                       -- chumba (hiari)
  slot_type text not null default 'lesson' check (slot_type in ('lesson','break','assembly','other')),
  label text,                      -- kwa break/assembly: "Mapumziko", "Mkutano"

  created_at timestamptz not null default now(),

  -- Darasa moja lisiwe na vipindi viwili vinavyogongana kwa siku moja
  check (end_time > start_time)
);

create index idx_timetable_class on timetable_slots(class_id, day_of_week, start_time);
create index idx_timetable_teacher on timetable_slots(teacher_id, day_of_week);
create index idx_timetable_school on timetable_slots(school_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table timetable_slots enable row level security;

-- KUONA: mtu yeyote wa shule (staff, mzazi, mwanafunzi wa shule hiyo)
create policy timetable_select on timetable_slots for select to authenticated
  using (
    is_super_admin()
    or school_id = auth_school_id()
  );

-- KUONGEZA/KUBADILISHA/KUFUTA: manager pekee (mkuu/mmiliki)
-- (kupanga ratiba ni kazi ya utawala)
create policy timetable_insert on timetable_slots for insert to authenticated
  with check ( is_school_manager() and school_id = auth_school_id() );

create policy timetable_update on timetable_slots for update to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

create policy timetable_delete on timetable_slots for delete to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- Function: ratiba ya darasa (siku zote)
-- ------------------------------------------------------------
create or replace function class_timetable(p_class_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
  v_school uuid;
begin
  select school_id into v_school from classes where id = p_class_id;
  if v_school is null then raise exception 'Darasa halipo'; end if;

  if not (is_super_admin() or v_school = auth_school_id()) then
    raise exception 'Huna ruhusa';
  end if;

  select coalesce(json_agg(row_to_json(t) order by t.day_of_week, t.start_time), '[]'::json)
  into result
  from (
    select
      ts.id, ts.day_of_week, ts.start_time, ts.end_time,
      ts.slot_type, ts.label, ts.room,
      sub.name as subject_name,
      concat_ws(' ', p.full_name) as teacher_name
    from timetable_slots ts
    left join subjects sub on sub.id = ts.subject_id
    left join profiles p on p.id = ts.teacher_id
    where ts.class_id = p_class_id
  ) t;

  return result;
end;
$fn$;

grant execute on function class_timetable(uuid) to authenticated;

-- ------------------------------------------------------------
-- Function: ratiba ya mwalimu (siku zote, madarasa yote)
-- ------------------------------------------------------------
create or replace function teacher_timetable(p_teacher_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
  v_school uuid;
begin
  select school_id into v_school from profiles where id = p_teacher_id;
  if v_school is null then raise exception 'Mwalimu hapatikani'; end if;

  if not (is_super_admin() or v_school = auth_school_id()) then
    raise exception 'Huna ruhusa';
  end if;

  select coalesce(json_agg(row_to_json(t) order by t.day_of_week, t.start_time), '[]'::json)
  into result
  from (
    select
      ts.id, ts.day_of_week, ts.start_time, ts.end_time,
      ts.slot_type, ts.label, ts.room,
      sub.name as subject_name,
      case when c.stream is not null then c.name||' '||c.stream else c.name end as class_name
    from timetable_slots ts
    left join subjects sub on sub.id = ts.subject_id
    left join classes c on c.id = ts.class_id
    where ts.teacher_id = p_teacher_id and ts.slot_type = 'lesson'
  ) t;

  return result;
end;
$fn$;

grant execute on function teacher_timetable(uuid) to authenticated;
