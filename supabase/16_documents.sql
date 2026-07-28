-- ============================================================
-- CLASSLINK V3 — AWAMU 11: DOCUMENTS (NYARAKA RASMI)
-- Endesha baada ya 15_inventory.sql
-- ============================================================
-- Jedwali: documents — huhifadhi MAELEZO ya nyaraka.
-- Faili zenyewe zinakaa Supabase Storage (bucket: 'documents').
--
-- Ufikiaji (audience):
--   staff   -> staff wa shule pekee (mkuu, mwalimu, staff)
--   parents -> pamoja na wazazi/wanafunzi wa shule
--   public  -> wote wa shule
-- Nyaraka za mwanafunzi: student_id (hiari) — mzazi/mwanafunzi
--   husika huona zake hata kama audience=staff.
--
-- MUHIMU: Baada ya SQL hii, lazima utengeneze bucket 'documents'
-- kwenye Supabase Dashboard + policies za Storage (maelezo mwishoni).
-- ============================================================

create table documents (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,

  title text not null,
  description text,
  category text not null default 'other' check (category in (
    'policy','form','notice','certificate','letter','report','financial','other'
  )),

  -- Faili (kwenye Supabase Storage bucket 'documents')
  file_path text not null,            -- path ndani ya bucket
  file_name text not null,            -- jina halisi la faili
  file_size bigint,                   -- ukubwa kwa bytes
  mime_type text,

  audience text not null default 'staff' check (audience in ('staff','parents','public')),
  student_id uuid references students(id) on delete cascade,   -- hiari (nyaraka ya mwanafunzi)

  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_documents_school on documents(school_id, category);
create index idx_documents_student on documents(student_id);

-- ============================================================
-- RLS
-- ============================================================
alter table documents enable row level security;

-- KUONA:
--   super_admin: zote
--   manager (mkuu/mmiliki): zote za shule yao
--   staff wengine (mwalimu/staff): audience staff/parents/public
--   mzazi/mwanafunzi: audience parents/public, AU nyaraka ya mtoto/wao
create policy documents_select on documents for select to authenticated
  using (
    is_super_admin()
    or (is_school_manager() and school_id = auth_school_id())
    or (
      is_school_staff() and school_id = auth_school_id()
      and audience in ('staff','parents','public')
    )
    or (
      school_id = auth_school_id()
      and (
        audience in ('parents','public')
        or student_id in (select my_student_ids())
      )
    )
  );

-- KUPAKIA/KUHARIRI/KUFUTA: manager pekee
create policy documents_insert on documents for insert to authenticated
  with check ( is_school_manager() and school_id = auth_school_id() );

create policy documents_update on documents for update to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );

create policy documents_delete on documents for delete to authenticated
  using ( is_school_manager() and school_id = auth_school_id() );
