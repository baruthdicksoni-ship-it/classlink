import { NavLink } from 'react-router-dom'
import { X, GraduationCap } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

function NavItem({ item, onNavigate }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-white/20 text-white shadow-sm'
            : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-white' : 'text-emerald-100/70 group-hover:text-white'}`} />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ nav = [], open, onClose, flat = false }) {
  const { school, can } = useAuth()

  const sections = flat
    ? [{ section: null, items: nav.filter((i) => !i.permission || can(i.permission)) }]
    : nav
        .map((s) => ({ ...s, items: s.items.filter((i) => !i.permission || can(i.permission)) }))
        .filter((s) => s.items.length > 0)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500
                    transition-transform lg:translate-x-0 lg:static lg:z-auto
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          {/* Nembo */}
          <div className="flex h-16 items-center justify-between px-5">
            <div className="flex min-w-0 items-center gap-3">
              {school?.logo_url ? (
                <img src={school.logo_url} alt="" className="h-9 w-9 rounded-xl object-cover ring-2 ring-white/30" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 shadow-sm">
                  <GraduationCap className="h-5 w-5 text-brand-600" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-white">
                  {school?.name || 'ClassLink'}
                </p>
                <p className="text-[11px] font-medium text-emerald-100/70">ClassLink</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-emerald-100/80 hover:bg-white/10 hover:text-white lg:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-7 overflow-y-auto px-3 pb-4 pt-2">
            {sections.map((s, i) => (
              <div key={i}>
                {s.section && (
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/50">
                    {s.section}
                  </p>
                )}
                <div className="space-y-0.5">
                  {s.items.map((item) => (
                    <NavItem key={item.to} item={item} onNavigate={onClose} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="px-5 py-4">
            <p className="text-[11px] text-emerald-100/40">ClassLink v3.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
