-- ============================================================
-- CLASSLINK V3 — AWAMU 11: SERA ZA STORAGE (DOCUMENTS)
-- Endesha BAADA ya kutengeneza bucket 'documents'
-- ============================================================
-- HATUA YA 1 (kwenye Supabase Dashboard, si SQL):
--   Storage -> New bucket
--   Name: documents
--   Public: HAPANA (private — tunatumia signed URLs)
--   Kisha rudi hapa na uendeshe SQL hii.
--
-- Sera hizi zinahakikisha:
--   - Manager pekee anapakia/kufuta faili za shule yake
--   - Mtu yeyote aliyeingia wa shule anaweza kusoma
--     (RLS ya jedwali 'documents' ndiyo inadhibiti nani aone nini;
--      Storage inaruhusu kusoma, jedwali linachuja)
-- ============================================================

-- Njia ya faili: <school_id>/<jina>. Sehemu ya kwanza = school_id.

-- KUPAKIA: manager wa shule (school_id = sehemu ya kwanza ya path)
create policy "documents_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and is_school_manager()
  and (storage.foldername(name))[1] = auth_school_id()::text
);

-- KUFUTA: manager wa shule
create policy "documents_remove"
on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and is_school_manager()
  and (storage.foldername(name))[1] = auth_school_id()::text
);

-- KUSOMA: mtu yeyote aliyeingia wa shule hiyo
--   (signed URL huhitaji ruhusa hii; jedwali 'documents' ndilo
--    linalodhibiti nani aona nyaraka gani)
create policy "documents_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth_school_id()::text
);
