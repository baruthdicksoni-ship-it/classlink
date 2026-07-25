# ClassLink v3.0

Mfumo wa usimamizi wa shule (multi-tenant School Management SaaS) kwa shule za Tanzania.

---

## Jinsi ya kuanza

### 1. Supabase

Tengeneza project mpya kwenye [supabase.com](https://supabase.com), kisha kwenye **SQL Editor** endesha mafaili haya **kwa mpangilio huu**:

| # | Faili | Kinachofanya |
|---|-------|--------------|
| 1 | `supabase/01_schema.sql` | Majedwali yote |
| 2 | `supabase/02_rls.sql` | Ulinzi wa data (RLS) |
| 3 | `supabase/03_functions_seed.sql` | Triggers na functions |

> **Muhimu:** `02_rls.sql` lazima liendeshwe baada ya `01_schema.sql`, la sivyo litakosa majedwali.

### 2. Mipangilio

```bash
cp .env.example .env
```

Jaza:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Zinapatikana Supabase → **Settings → API**.

### 3. Endesha

```bash
npm install
npm run dev
```

---

## Kutengeneza mtumiaji wa kwanza

Mfumo unahitaji **super admin** mmoja kuanza. Fanya hivi:

**Hatua 1** — Supabase → Authentication → Users → **Add user**. Weka barua pepe na nenosiri.

**Hatua 2** — SQL Editor, endesha:

```sql
update profiles
set role = 'super_admin', school_id = null, full_name = 'Jina Lako'
where email = 'barua@yako.com';
```

**Hatua 3** — Ingia kwenye mfumo. Utapelekwa `/platform` ambapo unaweza kusajili shule.

### Kuongeza msimamizi wa shule

Baada ya kusajili shule, chukua `id` yake kisha:

```sql
update profiles
set role = 'school_admin', school_id = 'SCHOOL_ID_HAPA'
where email = 'admin@shule.ac.tz';
```

### Madaraja ya mitihani

Weka kupitia ukurasa wa **Mipangilio**, au kwa SQL:

```sql
insert into grade_scales (school_id, grade, min_marks, max_marks, points, remarks) values
  ('SCHOOL_ID','A',75,100,1,'Bora sana'),
  ('SCHOOL_ID','B',65,74.99,2,'Vizuri sana'),
  ('SCHOOL_ID','C',45,64.99,3,'Wastani'),
  ('SCHOOL_ID','D',30,44.99,4,'Hafifu'),
  ('SCHOOL_ID','F',0,29.99,5,'Amefeli');
```

---

## Muundo wa faili

```
src/
├── config/
│   ├── roles.js          # Roles na ruhusa — mahali PEKEE pa kubadilisha ruhusa
│   └── navigation.js     # Menu — ongeza ukurasa mpya hapa
├── contexts/
│   └── AuthContext.jsx   # Session, profile, shule
├── hooks/
│   └── useSupabaseQuery.js  # useTable, useInsert, useUpdate, useDelete, useRpc
├── lib/
│   └── supabase.js
├── components/
│   ├── ui/               # Button, Input, Modal, Table, Toast...
│   ├── layout/           # Sidebar, Topbar, AppShell
│   └── shared/           # ErrorBoundary, ProtectedRoute, PageHeader...
├── pages/
│   ├── auth/             # Login
│   ├── platform/         # Super admin
│   ├── school/           # Admin & mwalimu
│   └── portal/           # Mzazi & mwanafunzi
└── utils/
    ├── format.js         # Tarehe, fedha, majina, labels za Kiswahili
    └── validate.js       # Uthibitishaji wa fomu
```

---

## Roles

| Role | Anachoweza |
|------|-----------|
| `super_admin` | Kila kitu; anasimamia shule zote |
| `school_admin` | Kila kitu ndani ya shule yake |
| `teacher` | Kusoma wanafunzi, kuchukua mahudhurio, kuingiza matokeo |
| `parent` | Kuona watoto wake tu |
| `student` | Kuona taarifa zake tu |

Ruhusa zote ziko `src/config/roles.js`. Ukibadilisha hapo, menu na kurasa zote zinafuata mara moja.

---

## Kuongeza ukurasa mpya

1. Tengeneza faili `src/pages/school/KituChangu.jsx`
2. Ongeza ruhusa `src/config/roles.js` (mfano `library.view`)
3. Ongeza kwenye menu `src/config/navigation.js`
4. Ongeza route `src/App.jsx`:

```jsx
<Route path="library" element={
  <ProtectedRoute permission="library.view"><Library /></ProtectedRoute>
} />
```

---

## Modules zilizopo

- Dashibodi (takwimu za shule)
- Wanafunzi (usajili kamili + mlezi)
- Mahudhurio (kwa darasa na tarehe)
- Madarasa na mikondo
- Masomo
- Mitihani (na kutangaza matokeo)
- Matokeo (kuingiza alama + madaraja ya kiotomatiki)
- Walimu
- Ada (ankara + malipo ya mitandao ya simu)
- Matangazo
- Mipangilio (shule + madaraja)
- Jukwaa (usimamizi wa shule zote)
- Portal ya mzazi/mwanafunzi

---

## Deployment

**Vercel** — `vercel.json` ipo tayari. Weka env variables kwenye dashboard.

**Cloudflare Pages / Netlify** — `public/_redirects` ipo tayari.
Build command: `npm run build` · Output: `dist`

---

## Vitu vya kuzingatia

**RLS haitegemei frontend.** Kila query inachujwa na database yenyewe. Hata mtu akibadilisha JavaScript, hataona data ya shule nyingine.

**Hakuna infinite recursion.** RLS policies zinatumia `security definer` functions (`auth_role()`, `auth_school_id()`) badala ya subqueries kwenye `profiles`. Hii ndiyo iliyokuwa tatizo la v2.

**ErrorBoundary ina kitufe cha kufuta cache.** Mtumiaji akipata hitilafu ya cache, anabofya "Pakia upya" na session inafutwa.

**Makosa yako kwa Kiswahili.** `translateError()` inabadilisha makosa ya Postgres kuwa maneno yanayoeleweka.
