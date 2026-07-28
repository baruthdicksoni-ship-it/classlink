-- ============================================================
-- CLASSLINK V3 — AWAMU 9: HR / WAFANYAKAZI
-- Endesha baada ya 13_calendar.sql
-- ============================================================
-- Sehemu tatu:
--   1. Cheo kipya 'staff' (mfanyakazi asiye mwalimu)
--   2. staff_records — maelezo ya HR (aina ya kazi, ajira, mshahara)
--   3. leave_requests — maombi ya likizo + idhini
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ongeza cheo 'staff' kwenye profiles
-- ------------------------------------------------------------
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('super_admin','school_owner','school_admin','teacher','staff','parent','student'));

-- Sasisha helper: is_school_staff() ijumuishe cheo 'staff'
create or replace function is_school_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select role in ('school_owner','school_admin','teacher','staff')
  from profiles where id = auth.uid();
$fn$;

-- ------------------------------------------------------------
-- 2. staff_records — maelezo ya HR
-- Kila mfanyakazi (profile) anaweza kuwa na rekodi moja ya HR
-- ------------------------------------------------------------
create table staff_records (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  profile_id uuid not null unique references profiles(id) on delete cascade,

  job_title text,                    -- mfano: Mlinzi, Mpishi, Dereva, Mhasibu
  department text,                   -- mfano: Utawala, Usalama, Chakula
  employment_type text default 'full_time' check (employment_type in ('full_time','part_time','contract','volunteer')),
  hire_date date,
  salary numeric(12,2),              -- hiari — manager pekee ataona
  phone text,
  national_id text,
  emergency_contact text,
  notes text,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_staff_records_school on staff_records(school_id);

-- ------------------------------------------------------------
-- 3. leave_requests — maombi ya likizo
-- ------------------------------------------------------------
create table leave_requests (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,

  leave_type text not null default 'other' check (leave_type in (
    'annual','sick','maternity','paternity','compassionate','study','other'
  )),
  start_date date not null,
  end_date date not null,
  reason text,

  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,

  created_at timestamptz not null default now(),

  check (end_date >= start_date)
);

create index idx_leave_school on leave_requests(school_id, status);
create index idx_leave_profile on leave_requests(profile_id);

-- ============================================================
-- RLS
-- ============================================================

-- ------------------------------------------------------------
-- staff_records
-- ------------------------------------------------------------
alter table staff_records enable row level security;

-- KUONA: manager anaona zote; mfanyakazi anaona yake mwenyewe
--   (lakini mshahara — tutashughulikia frontend kwa manager pekee)
create policy staff_records_select on staff_records for select to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())
    or profile_id = auth.uid()
  );

-- KUANDIKA: manager pekee
create policy staff_records_insert on staff_records for insert to authenticated
  with check ( is_school_manager() and school_id = auth_school_id() );

create policy staff_records_update on staff_records for update to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

create policy staff_records_delete on staff_records for delete to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- leave_requests
-- ------------------------------------------------------------
alter table leave_requests enable row level security;

-- KUONA: manager anaona zote; mfanyakazi anaona zake
create policy leave_select on leave_requests for select to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())
    or profile_id = auth.uid()
  );

-- KUOMBA: mfanyakazi yeyote wa shule anaomba likizo yake mwenyewe
create policy leave_insert on leave_requests for insert to authenticated
  with check (
    is_school_staff()
    and school_id = auth_school_id()
    and profile_id = auth.uid()
  );

-- KUFUTA/KUGHAIRI: mwenye ombi (kabla haijaidhinishwa) au manager
create policy leave_delete on leave_requests for delete to authenticated
  using (
    (profile_id = auth.uid() and status = 'pending')
    or (is_school_manager() and school_id = auth_school_id())
  );

-- KUBADILISHA (idhini): manager pekee — kupitia function
create policy leave_update on leave_requests for update to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

-- ------------------------------------------------------------
-- Function: idhinisha/kataa likizo (manager pekee)
-- ------------------------------------------------------------
create or replace function review_leave(
  p_leave_id uuid,
  p_status text,           -- 'approved' au 'rejected'
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
begin
  select school_id into v_school from leave_requests where id = p_leave_id;
  if v_school is null then raise exception 'Ombi halipo'; end if;

  if not (is_super_admin() or (is_school_manager() and v_school = auth_school_id())) then
    raise exception 'Ni mkuu au mmiliki pekee anayeweza kuidhinisha likizo';
  end if;

  if p_status not in ('approved','rejected') then
    raise exception 'Hali si sahihi';
  end if;

  update leave_requests
  set status = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_note
  where id = p_leave_id and status = 'pending';
end;
$fn$;

grant execute on function review_leave(uuid, text, text) to authenticated;

-- Trigger ya updated_at kwa staff_records
create trigger touch_staff_records before update on staff_records
  for each row execute function touch_updated_at();
