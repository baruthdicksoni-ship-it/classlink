import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ------------------------------------------------------------
// Soma orodha kutoka jedwali lolote, ikichujwa kwa shule
// ------------------------------------------------------------
export function useTable(table, {
  select = '*',
  filters = {},
  order = { column: 'created_at', ascending: false },
  enabled = true,
  scopeToSchool = true
} = {}) {
  const { schoolId, role } = useAuth()

  return useQuery({
    queryKey: [table, schoolId, select, filters, order],
    enabled: enabled && (!scopeToSchool || Boolean(schoolId) || role === 'super_admin'),
    queryFn: async () => {
      let q = supabase.from(table).select(select)

      if (scopeToSchool && schoolId) q = q.eq('school_id', schoolId)

      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') continue
        if (Array.isArray(value)) q = q.in(key, value)
        else q = q.eq(key, value)
      }

      if (order?.column) q = q.order(order.column, { ascending: order.ascending ?? false })

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return data ?? []
    }
  })
}

// ------------------------------------------------------------
// Soma rekodi moja
// ------------------------------------------------------------
export function useRecord(table, id, { select = '*', enabled = true } = {}) {
  return useQuery({
    queryKey: [table, 'one', id, select],
    enabled: enabled && Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select(select).eq('id', id).maybeSingle()
      if (error) throw new Error(error.message)
      return data
    }
  })
}

// ------------------------------------------------------------
// Ongeza / Badilisha / Futa
// ------------------------------------------------------------
export function useInsert(table) {
  const qc = useQueryClient()
  const { schoolId } = useAuth()

  return useMutation({
    mutationFn: async (payload) => {
      const body = Array.isArray(payload)
        ? payload.map((r) => ({ school_id: schoolId, ...r }))
        : { school_id: schoolId, ...payload }

      const { data, error } = await supabase.from(table).insert(body).select()
      if (error) throw new Error(translateError(error))
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] })
  })
}

export function useUpdate(table) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }) => {
      const { data, error } = await supabase.from(table).update(changes).eq('id', id).select()
      if (error) throw new Error(translateError(error))
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] })
  })
}

export function useDelete(table) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw new Error(translateError(error))
      return id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] })
  })
}

// ------------------------------------------------------------
// RPC
// ------------------------------------------------------------
export function useRpc(fn, params, { enabled = true, key } = {}) {
  return useQuery({
    queryKey: [key || fn, params],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(fn, params)
      if (error) throw new Error(error.message)
      return data
    }
  })
}

// ------------------------------------------------------------
// Tafsiri makosa ya Postgres kwa Kiswahili
// ------------------------------------------------------------
export function translateError(error) {
  const msg = error?.message || ''
  if (error?.code === '23505' || msg.includes('duplicate key')) {
    return 'Rekodi hii tayari ipo. Angalia namba ya usajili au jina.'
  }
  if (error?.code === '23503') {
    return 'Rekodi hii imeunganishwa na taarifa nyingine, haiwezi kufutwa.'
  }
  if (msg.includes('row-level security') || msg.includes('policy')) {
    return 'Huna ruhusa ya kufanya kitendo hiki.'
  }
  if (msg.includes('violates check constraint')) {
    return 'Baadhi ya taarifa ulizojaza si sahihi.'
  }
  return msg || 'Imeshindikana. Jaribu tena.'
}
