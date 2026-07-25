import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Mipangilio ya Supabase haipo. Weka VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY kwenye faili la .env'
  )
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'classlink.auth'
  }
})
