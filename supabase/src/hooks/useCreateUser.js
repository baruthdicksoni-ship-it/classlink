import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Inaita Edge Function 'create-user'.
// Supabase JS client inaambatanisha token ya mtumiaji kiotomatiki.
export function useCreateUser() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: payload
      })

      // Kosa la mtandao / function haikupatikana
      if (error) {
        // Jaribu kusoma ujumbe kutoka kwa response
        let msg = error.message || 'Imeshindwa kutengeneza mtumiaji.'
        try {
          const ctx = await error.context?.json?.()
          if (ctx?.error) msg = ctx.error
        } catch { /* noop */ }
        throw new Error(msg)
      }

      // Function ilirudisha kosa (mfano: huna ruhusa)
      if (data?.error) throw new Error(data.error)

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] })
    }
  })
}
