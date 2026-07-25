-- ============================================================
-- CLASSLINK V3 — SCHEMA
-- Multi-tenant School Management System
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. TENANCY
-- ============================================================

create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  motto text,
  logo_url text,
  address text,
  region text,
  district text,
  phone text,
  email text,
  registration_no text,
  level text not null default 'secondary',   -- primary | secondary | both
  is_active boolean not null default true,
  subscription_plan text not null default 'basic',
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_schools_slug on schools(slug);

-- ============================================================
-- 2. USERS & ROLES
-- ============================================================
-- Roles: super_admin | school_admin | teacher | parent | student

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  role text not null check (role in ('super_admin','school_admin','teacher','parent','student')),
  full_name text not null,
  phone text,
  email text,
  avatar_url text,
  gender text check (gender in ('male','female')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_profiles_school on profiles(school_id);
create index idx_profiles_role on profiles(role);

-- super_admin ana school_id = null
alter table profiles add constraint chk_school_required
  check ( (role = 'super_admin' and school_id is null)
       or (role <> 'super_admin' and school_id is not null) );

-- ============================================================
-- 3. ACADEMIC STRUCTURE
-- ============================================================

create table academic_years (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,              -- "2026"
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table terms (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  name text not null,              -- "Muhula wa Kwanza"
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create table classes (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,              -- "Form 1"
  stream text,                     -- "A"
  level int,                       -- 1..6
  class_teacher_id uuid references profiles(id) on delete set null,
  capacity int default 60,
  created_at timestamptz not null default now(),
  unique (school_id, name, stream)
);

create index idx_classes_school on classes(school_id);

create table subjects (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,              -- "Hisabati"
  code text not null,              -- "MATH"
  is_core boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, code)
);

-- Mwalimu anafundisha somo gani darasa gani
create table teaching_assignments (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  academic_year_id uuid references academic_years(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, subject_id, class_id, academic_year_id)
);

-- ============================================================
-- 4. STUDENTS
-- ============================================================

create table students (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  admission_no text not null,
  first_name text not null,
  middle_name text,
  last_name text not null,
  gender text not null check (gender in ('male','female')),
  date_of_birth date,
  class_id uuid references classes(id) on delete set null,
  admission_date date not null default current_date,
  status text not null default 'active' check (status in ('active','graduated','transferred','dropped','suspended')),
  photo_url text,
  address text,
  guardian_name text,
  guardian_phone text,
  guardian_relation text,
  created_at timestamptz not null default now(),
  unique (school_id, admission_no)
);

create index idx_students_school on students(school_id);
create index idx_students_class on students(class_id);
create index idx_students_status on students(status);

-- Mzazi <-> Mwanafunzi
create table guardians (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  parent_profile_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  relation text not null default 'parent',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (parent_profile_id, student_id)
);

-- ============================================================
-- 5. ATTENDANCE
-- ============================================================

create table attendance (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present','absent','late','excused')),
  note text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create index idx_attendance_date on attendance(school_id, date);
create index idx_attendance_student on attendance(student_id);

-- ============================================================
-- 6. EXAMS & RESULTS
-- ============================================================

create table exams (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  term_id uuid not null references terms(id) on delete cascade,
  name text not null,              -- "Mtihani wa Katikati ya Muhula"
  exam_type text not null default 'midterm' check (exam_type in ('quiz','midterm','terminal','mock','national')),
  start_date date,
  end_date date,
  max_marks int not null default 100,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table results (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  marks numeric(5,2),
  grade text,
  remarks text,
  entered_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, student_id, subject_id)
);

create index idx_results_exam on results(exam_id);
create index idx_results_student on results(student_id);

-- Mfumo wa madaraja (grading) kwa kila shule
create table grade_scales (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  grade text not null,             -- "A"
  min_marks numeric(5,2) not null,
  max_marks numeric(5,2) not null,
  points int,
  remarks text,                    -- "Bora sana"
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. FEES
-- ============================================================

create table fee_structures (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  academic_year_id uuid references academic_years(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  name text not null,              -- "Ada ya Muhula"
  amount numeric(12,2) not null,
  is_mandatory boolean not null default true,
  created_at timestamptz not null default now()
);

create table fee_invoices (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  term_id uuid references terms(id) on delete set null,
  invoice_no text not null,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  due_date date,
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid','waived')),
  created_at timestamptz not null default now(),
  unique (school_id, invoice_no)
);

create index idx_invoices_student on fee_invoices(student_id);

create table fee_payments (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  invoice_id uuid not null references fee_invoices(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null default 'cash' check (method in ('cash','mpesa','tigopesa','airtel','halopesa','bank','cheque')),
  reference text,
  paid_at timestamptz not null default now(),
  received_by uuid references profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index idx_payments_invoice on fee_payments(invoice_id);

-- ============================================================
-- 8. ANNOUNCEMENTS
-- ============================================================

create table announcements (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all','teachers','parents','students')),
  class_id uuid references classes(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. AUDIT LOG
-- ============================================================

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_school on audit_logs(school_id, created_at desc);
