import { useState, useRef, useEffect } from 'react'
import { Menu, LogOut, User, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/config/roles'

export default function Topbar({ onMenuClick }) {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const initials = (profile?.full_name || '?')
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <button onClick={onMenuClick} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-slate-100"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-xs font-semibold text-white shadow-sm">
            {initials}
          </div>
          <div className="hidden text-left sm:block">
            <p className="max-w-[140px] truncate text-sm font-medium text-slate-800">
              {profile?.full_name}
            </p>
            <p className="text-[11px] text-slate-400">{ROLE_LABELS[profile?.role]}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/60">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-slate-900">{profile?.full_name}</p>
              <p className="truncate text-xs text-slate-400">{profile?.email}</p>
            </div>
            <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
              <User className="h-4 w-4 text-slate-400" /> Wasifu wangu
            </button>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Toka
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
