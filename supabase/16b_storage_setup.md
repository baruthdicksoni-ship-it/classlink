# Awamu 11 — Kuandaa Supabase Storage kwa Nyaraka

Tofauti na awamu zilizopita, Nyaraka zinahitaji **Supabase Storage** kuhifadhi faili. Hatua hizi ni za **mara moja tu** — baada ya kuziweka, kila kitu kitafanya kazi.

## Hatua 1 — Tengeneza bucket

1. Fungua Supabase Dashboard → **Storage** (menu ya kushoto)
2. Bofya **New bucket**
3. Jina: `documents` (herufi ndogo, ndivyo hasa)
4. **Public bucket: ZIMA** (iache private — nyaraka ni za shule, si za umma)
5. Bofya **Save**

## Hatua 2 — Weka policies za Storage

Faili zinahitaji sheria za nani anaweza kupakia/kupakua. Nenda **SQL Editor** na endesha hii:

```sql
-- Ruhusu watumiaji walioingia kupakia kwenye bucket 'documents'
-- (RLS ya jedwali 'documents' ndiyo inayodhibiti nani anaona nini;
--  hapa tunaruhusu tu operesheni za Storage kwa walioingia)

-- KUPAKIA: mtumiaji aliyeingia anaweza kupakia
create policy "documents_upload"
on storage.objects for insert to authenticated
with check ( bucket_id = 'documents' );

-- KUSOMA: mtumiaji aliyeingia anaweza kusoma
-- (signed URLs zinatumika, lakini policy inahitajika)
create policy "documents_read"
on storage.objects for select to authenticated
using ( bucket_id = 'documents' );

-- KUFUTA: mtumiaji aliyeingia anaweza kufuta
create policy "documents_delete"
on storage.objects for delete to authenticated
using ( bucket_id = 'documents' );
```

## Muhimu kuhusu usalama

Faili zenyewe zinapakuliwa kupitia **signed URLs** — viungo vinavyoisha muda baada ya sekunde 60. Kwa hiyo hata kama mtu ana link, itakuwa imekwisha muda haraka.

Udhibiti wa nani anaona nyaraka gani (uongozi/wafanyakazi/wote) uko kwenye **jedwali la `documents`** kupitia RLS — hiyo tuliijaribu tayari. Storage policies hapo juu zinaruhusu tu operesheni za faili kwa watumiaji walioingia; orodha ya nyaraka inayoonekana inadhibitiwa na jedwali.

## Baada ya kuweka

Jaribu: nenda ukurasa wa Nyaraka, bofya "Pakia nyaraka", chagua faili (PDF), weka kichwa, chagua wanaoona, pakia. Kisha bofya kitufe cha kupakua (⬇) uone faili inafunguka.
