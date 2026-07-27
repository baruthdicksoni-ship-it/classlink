# ClassLink — Mpango wa Akaunti ya Mkuu wa Shule

Nyaraka hii inaonyesha njia ya kufikia maono yako ya akaunti kamili ya Mkuu wa Shule (Headteacher). Kila awamu inajengwa kikamilifu kabla ya kuanza inayofuata.

---

## Kanuni ya msingi

Tunajenga **feature moja kamili kwa wakati**, si nyingi za juujuu. Kila awamu:
- Inajaribiwa kwenye database halisi (RLS, functions)
- Inafanya kazi kikamilifu mwisho hadi mwisho
- Haivunji kilichopo

Sababu: ClassLink V2 ilikufa kwa kuwa na moduli 20+ zisizokamilika. Hatutarudia kosa hilo.

---

## Hali ya sasa: kilichopo tayari

Mkuu wa shule (`school_admin`) tayari anaweza:

| Eneo | Hali |
|------|------|
| Dashibodi (takwimu za msingi) | ✅ Ipo |
| Wanafunzi (kusajili, kuhariri, kufuta) | ✅ Ipo |
| Walimu (kutengeneza, kusimamia) | ✅ Ipo |
| Madarasa na masomo | ✅ Ipo |
| Mahudhurio ya wanafunzi | ✅ Ipo |
| Mitihani na matokeo | ✅ Ipo |
| Matangazo | ✅ Ipo |
| Ada | ❌ Haoni (ni ya mmiliki) — itabadilishwa kuwa "view only" |

---

## Awamu za ujenzi

### AWAMU 1 — Dashibodi kamili ya Mkuu ⭐ (tunaanza hapa)

Kuboresha dashibodi iwe kitovu cha uendeshaji:
- Jumla ya wanafunzi (wavulana/wasichana)
- Jumla ya walimu na wafanyakazi
- Mahudhurio ya leo (asilimia + idadi)
- Ada: zilizolipwa, zinazodaiwa (view only kwa mkuu)
- Matukio muhimu yajayo (kutoka calendar — awamu 8)
- **Tahadhari**: wanafunzi ada haijalipwa, mahudhurio ya chini, mitihani isiyotangazwa
- Grafu ya mwenendo wa mahudhurio (wiki)
- Vitufe vya haraka (sajili mwanafunzi, chukua mahudhurio, andika tangazo)

*Database: hakuna jedwali jipya. Tunatumia yaliyopo + function moja ya takwimu.*

---

### AWAMU 2 — Ada kwa Mkuu (view only)

Mkuu aone fedha bila kuzibadilisha:
- Kuona mapato ya leo/mwezi
- Kuona wanaodaiwa
- Ripoti za kifedha (kusoma tu)
- Hawezi kutengeneza ankara wala kupokea malipo (hiyo ni ya mmiliki)

*Database: RLS ndogo — mkuu apewe `select` kwenye fedha, si `insert/update`.*

---

### AWAMU 3 — Kuidhinisha matokeo + Report Cards

- Mkuu aidhinishe matokeo kabla ya kutangazwa
- Kuchapisha report card ya mwanafunzi (PDF)
- Muhtasari wa ufaulu wa darasa

*Database: kuongeza `approved_by`, `approved_at` kwenye exams. Function ya report card.*

---

### AWAMU 4 — Ripoti (PDF)

- Ripoti ya mahudhurio (kwa darasa, kwa muda)
- Ripoti ya ada (waliolipa/wanaodaiwa)
- Ripoti ya wanafunzi (orodha, takwimu)
- Ripoti ya matokeo (ufaulu wa darasa/somo)
- Kupakua kama PDF

*Database: hakuna jedwali jipya. Tunatumia data iliyopo.*

---

### AWAMU 5 — Nidhamu

- Kurekodi kesi za nidhamu za wanafunzi
- Kutoa maamuzi/adhabu
- Historia ya nidhamu ya mwanafunzi
- Kuwasiliana na wazazi kuhusu kesi

*Database: jedwali jipya `discipline_cases`. RLS + kurasa.*

---

### AWAMU 6 — Ratiba (Timetable)

- Kupanga ratiba ya masomo kwa darasa
- Kuona ratiba ya mwalimu
- Mkuu kuidhinisha mabadiliko

*Database: jedwali jipya `timetable_slots`. RLS + kurasa.*

---

### AWAMU 7 — Mawasiliano (SMS + Email)

- Kutuma SMS kwa wazazi/walimu (kupitia Beem Africa)
- Kutuma email
- Historia ya ujumbe

*Database: jedwali jipya `messages`. Edge Function ya SMS. Inahitaji akaunti ya Beem.*

---

### AWAMU 8 — Calendar / Matukio

- Kalenda ya shule (mitihani, likizo, mikutano)
- Matukio yajayo kwenye dashibodi

*Database: jedwali jipya `calendar_events`. RLS + kurasa.*

---

### AWAMU 9 — HR / Wafanyakazi

- Kusimamia wafanyakazi wote (si walimu tu)
- Kuidhinisha likizo
- Tathmini za utendaji

*Database: majedwali `staff`, `leave_requests`, `evaluations`. Kubwa.*

---

### AWAMU 10 — Inventory

- Kurekodi vifaa vya shule
- Kufuatilia stock
- Tahadhari ya stock ndogo (inaunganishwa dashibodi)

*Database: majedwali `inventory_items`, `stock_movements`.*

---

### AWAMU 11 — Documents

- Kuhifadhi nyaraka rasmi
- Kupakua/kuchapisha

*Database: jedwali `documents` + Supabase Storage.*

---

### AWAMU 12 — Settings za Mkuu (ruhusa maalum)

- Kubadili mwaka wa masomo
- Kufungua/kufunga muhula
- Kubadili taarifa za shule (kama ameruhusiwa na mmiliki)

*Database: RLS + kurasa. Ndogo.*

---

## Muhtasari wa mamlaka (baada ya awamu zote)

**Mkuu ATAWEZA:**
- Kuona taarifa zote za shule (pamoja na fedha — kusoma)
- Kusimamia wanafunzi, walimu, taaluma
- Kuidhinisha matokeo, likizo, mabadiliko ya ratiba
- Kutoa matangazo na SMS
- Kuchapisha ripoti zote
- Kushughulikia nidhamu

**Mkuu HATAWEZA (isipokuwa mmiliki amruhusu):**
- Kumfuta mmiliki au mkurugenzi
- Kubadilisha bei za ada
- Kufuta taarifa za kifedha
- Kutoa ruhusa za super admin
- Kubadilisha mipangilio mikuu ya mfumo

Haya yamewekwa kwenye RLS ya database — si kwenye frontend tu — hivyo ni salama kweli.

---

## Tunaanza: AWAMU 1 — Dashibodi kamili

Baada ya kukubali mpango huu, ninajenga dashibodi ya mkuu ikiwa na takwimu zote, tahadhari, na grafu. Itajaribiwa na kufanya kazi kikamilifu kabla ya kwenda awamu 2.
