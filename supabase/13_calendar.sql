-- ============================================================
-- CLASSLINK V3 — AWAMU 8: CALENDAR / MATUKIO
-- Endesha baada ya 12_timetable.sql
-- ============================================================
-- Jedwali jipya: calendar_events
-- Aina za matukio: exam, holiday, meeting, event, other
-- ============================================================

create table calendar_events (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,

  title text not null,
  description text,
  category text not null default 'event' check (category in (
    'exam','holiday','meeting','event','other'
  )),

  start_date date not null,
  end_date date,                      -- kwa matukio ya siku nyingi (hiari)
  all_day boolean not null default true,
  start_time time,                    -- kama si all_day
  end_time time,

  audience text not null default 'all' check (audience in (
    'all','staff','students','parents'
  )),

  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  check (end_date is null or end_date >= start_date)
);

create index idx_calendar_school on calendar_events(school_id, start_date);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table calendar_events enable row level security;

-- KUONA: mtu yeyote wa shule (kalenda si siri)
create policy calendar_select on calendar_events for select to authenticated
  using (
    is_super_admin()
    or school_id = auth_school_id()
  );

-- KUANDIKA: manager pekee (mkuu/mmiliki)
create policy calendar_insert on calendar_events for insert to authenticated
  with check ( is_school_manager() and school_id = auth_school_id() );

create policy calendar_update on calendar_events for update to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

create policy calendar_delete on calendar_events for delete to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- Function: matukio yajayo (kwa dashibodi)
-- Inarudisha matukio yasiyopita, yakiwa yamepangwa kwa tarehe
-- ------------------------------------------------------------
create or replace function upcoming_events(p_school_id uuid, p_limit int default 5)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result json;
begin
  if not (is_super_admin() or p_school_id = auth_school_id()) then
    raise exception 'Huna ruhusa';
  end if;

  select coalesce(json_agg(row_to_json(t) order by t.start_date), '[]'::json)
  into result
  from (
    select id, title, category, start_date, end_date, all_day, start_time
    from calendar_events
    where school_id = p_school_id
      and coalesce(end_date, start_date) >= current_date
    order by start_date
    limit p_limit
  ) t;

  return result;
end;
$fn$;

grant execute on function upcoming_events(uuid, int) to authenticated;
