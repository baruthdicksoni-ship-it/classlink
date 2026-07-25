// ============================================================
// CLASSLINK — Edge Function: create-user
// ============================================================
// Inatengeneza mtumiaji mpya (owner, mkuu, mwalimu, mzazi...).
// service_role key inakaa HAPA (server) — kamwe si kwenye browser.
//
// Ruhusa (inathibitishwa hapa, si kutegemea frontend):
//   super_admin  -> anaweza kutengeneza yeyote kwa shule yoyote
//   school_owner -> school_admin, teacher, parent, student (shule yake)
//   school_admin -> teacher, parent, student (shule yake)
//   wengine      -> hawaruhusiwi
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Nani anaweza kutengeneza role gani
const ALLOWED: Record<string, string[]> = {
  super_admin:  ['super_admin', 'school_owner', 'school_admin', 'teacher', 'parent', 'student'],
  school_owner: ['school_admin', 'teacher', 'parent', 'student'],
  school_admin: ['teacher', 'parent', 'student']
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Njia si sahihi' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // 1) Thibitisha mwombaji ni nani (kwa token yake)
    const authHeader = req.headers.get('Authorization') || ''
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !caller) return json({ error: 'Hujaingia. Ingia kwanza.' }, 401)

    // 2) Chukua profile ya mwombaji (kwa service key ili kuepuka RLS)
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

    const { data: callerProfile, error: profErr } = await admin
      .from('profiles')
      .select('role, school_id')
      .eq('id', caller.id)
      .maybeSingle()

    if (profErr || !callerProfile) return json({ error: 'Wasifu wako haujapatikana.' }, 403)

    // 3) Soma ombi
    const body = await req.json().catch(() => ({}))
    const { email, password, full_name, role, phone, school_id, gender } = body

    if (!email || !password || !full_name || !role) {
      return json({ error: 'Jaza barua pepe, nenosiri, jina na cheo.' }, 400)
    }
    if (String(password).length < 6) {
      return json({ error: 'Nenosiri liwe na angalau herufi 6.' }, 400)
    }

    // 4) Je, mwombaji ana ruhusa kutengeneza role hii?
    const allowedRoles = ALLOWED[callerProfile.role] || []
    if (!allowedRoles.includes(role)) {
      return json({ error: `Huna ruhusa ya kutengeneza cheo cha "${role}".` }, 403)
    }

    // 5) Amua shule ya mtumiaji mpya
    let targetSchool: string | null = null
    if (role === 'super_admin') {
      targetSchool = null
    } else if (callerProfile.role === 'super_admin') {
      // super_admin lazima aeleze shule
      if (!school_id) return json({ error: 'Chagua shule ya mtumiaji.' }, 400)
      targetSchool = school_id
    } else {
      // owner/admin: mtumiaji mpya anaingia shule ya mwombaji tu
      targetSchool = callerProfile.school_id
    }

    // 6) Tengeneza mtumiaji (email tayari imethibitishwa — hakuna kusubiri barua pepe)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        phone: phone || null,
        school_id: targetSchool
      }
    })

    if (createErr) {
      const msg = createErr.message?.includes('already been registered')
        ? 'Barua pepe hii tayari imesajiliwa.'
        : createErr.message
      return json({ error: msg }, 400)
    }

    // 7) Hakikisha profile ina taarifa sahihi
    //    (trigger inatengeneza profile, lakini tunathibitisha hapa)
    const { error: upErr } = await admin
      .from('profiles')
      .update({
        full_name,
        role,
        phone: phone || null,
        school_id: targetSchool,
        gender: gender || null
      })
      .eq('id', created.user.id)

    if (upErr) {
      // Rudisha mtumiaji ili tusiache akaunti mbovu
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: 'Imeshindwa kukamilisha usajili: ' + upErr.message }, 500)
    }

    return json({
      ok: true,
      user: { id: created.user.id, email: created.user.email, role, full_name }
    })
  } catch (e) {
    return json({ error: 'Hitilafu ya server: ' + (e as Error).message }, 500)
  }
})
