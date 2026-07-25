import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { can as checkPermission } from '@/config/roles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [school, setSchool]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // Kuzuia setState baada ya component kuondoka
  const mounted = useRef(true)
  // Kuzuia fetch mbili za profile moja kwa wakati mmoja
  const fetching = useRef(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // Pakia profile + shule. Haitupi exception — inarudisha null ikikwama.
  const loadProfile = useCallback(async (userId) => {
    if (!userId) return null

    // Kama fetch ya userId huyu inaendelea, subiri hiyo hiyo
    if (fetching.current?.id === userId) return fetching.current.promise

    const promise = (async () => {
      try {
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('id, school_id, role, full_name, phone, email, avatar_url, gender, is_active')
          .eq('id', userId)
          .maybeSingle()

        if (profErr) throw profErr
        if (!prof) return { profile: null, school: null, error: 'Wasifu wako haujapatikana. Wasiliana na msimamizi.' }
        if (!prof.is_active) return { profile: null, school: null, error: 'Akaunti yako imesimamishwa. Wasiliana na msimamizi.' }

        let sch = null
        if (prof.school_id) {
          const { data: schData, error: schErr } = await supabase
            .from('schools')
            .select('id, name, slug, logo_url, motto, level, is_active, subscription_plan, subscription_expires_at')
            .eq('id', prof.school_id)
            .maybeSingle()

          if (schErr) throw schErr
          if (schData && !schData.is_active) {
            return { profile: null, school: null, error: 'Shule yako imesimamishwa kwa sasa.' }
          }
          sch = schData
        }

        return { profile: prof, school: sch, error: null }
      } catch (e) {
        return { profile: null, school: null, error: e.message || 'Imeshindikana kupakia taarifa zako.' }
      } finally {
        fetching.current = null
      }
    })()

    fetching.current = { id: userId, promise }
    return promise
  }, [])

  const applyResult = useCallback((res) => {
    if (!mounted.current) return
    setProfile(res?.profile ?? null)
    setSchool(res?.school ?? null)
    setError(res?.error ?? null)
  }, [])

  // Mzunguko mmoja tu wa kuanzisha
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const { data, error: sessErr } = await supabase.auth.getSession()
        if (cancelled || !mounted.current) return

        if (sessErr) {
          setError(sessErr.message)
          setLoading(false)
          return
        }

        const currentSession = data?.session ?? null
        setSession(currentSession)

        if (currentSession?.user?.id) {
          const res = await loadProfile(currentSession.user.id)
          if (cancelled || !mounted.current) return
          applyResult(res)
        }
      } catch (e) {
        if (!cancelled && mounted.current) setError(e.message)
      } finally {
        if (!cancelled && mounted.current) setLoading(false)
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted.current) return

      // TOKEN_REFRESHED haihitaji kupakia profile tena
      if (event === 'TOKEN_REFRESHED') {
        setSession(newSession)
        return
      }

      if (event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        setSchool(null)
        setError(null)
        setLoading(false)
        return
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setSession(newSession)
        if (newSession?.user?.id) {
          const res = await loadProfile(newSession.user.id)
          if (!mounted.current) return
          applyResult(res)
        }
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe()
    }
  }, [loadProfile, applyResult])

  const signIn = useCallback(async (email, password) => {
    setError(null)
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    })
    if (err) {
      const msg = err.message?.includes('Invalid login')
        ? 'Barua pepe au nenosiri si sahihi.'
        : err.message
      return { ok: false, error: msg }
    }
    return { ok: true, data }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    if (mounted.current) {
      setSession(null)
      setProfile(null)
      setSchool(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return
    const res = await loadProfile(session.user.id)
    applyResult(res)
  }, [session, loadProfile, applyResult])

  const can = useCallback((permission) => checkPermission(profile?.role, permission), [profile])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    school,
    role: profile?.role ?? null,
    schoolId: profile?.school_id ?? null,
    loading,
    error,
    isAuthenticated: Boolean(session && profile),
    can,
    signIn,
    signOut,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth lazima itumike ndani ya AuthProvider')
  return ctx
}
