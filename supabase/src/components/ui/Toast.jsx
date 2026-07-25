import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const styles = {
  success: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  error:   { icon: AlertCircle,  cls: 'bg-red-50 text-red-800 ring-red-200' },
  info:    { icon: Info,         cls: 'bg-brand-50 text-brand-800 ring-brand-200' }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  const toast = {
    success: (m) => push(m, 'success'),
    error:   (m) => push(m, 'error'),
    info:    (m) => push(m, 'info')
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
        {toasts.map((t) => {
          const { icon: Icon, cls } = styles[t.type]
          return (
            <div key={t.id} className={`flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg ring-1 ${cls}`}>
              <Icon className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="flex-1 text-sm">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast lazima itumike ndani ya ToastProvider')
  return ctx
}
