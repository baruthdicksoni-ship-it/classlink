import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLES } from '@/config/roles'
import {
  GraduationCap, ClipboardCheck, FileText, Wallet, ShieldAlert,
  CalendarDays, Users, BarChart3, Menu, X, ArrowRight, Check,
  Smartphone, Lock, Zap, Globe
} from 'lucide-react'

const FEATURES = [
  { icon: Users, title: 'Usimamizi wa Wanafunzi', desc: 'Sajili, hamisha na fuatilia wanafunzi wote mahali pamoja.' },
  { icon: ClipboardCheck, title: 'Mahudhurio', desc: 'Chukua mahudhurio ya kila siku kwa haraka, kwa darasa au mwanafunzi.' },
  { icon: FileText, title: 'Mitihani na Matokeo', desc: 'Ingiza matokeo, idhinisha, na chapisha report cards za wanafunzi.' },
  { icon: Wallet, title: 'Ada na Fedha', desc: 'Fuatilia malipo, wanaodaiwa, na ripoti za kifedha kwa uwazi.' },
  { icon: ShieldAlert, title: 'Nidhamu', desc: 'Rekodi kesi za nidhamu na wasiliana na wazazi.' },
  { icon: CalendarDays, title: 'Kalenda na Ratiba', desc: 'Panga ratiba ya masomo na matukio ya shule.' },
  { icon: BarChart3, title: 'Ripoti za Kina', desc: 'Toa ripoti za mahudhurio, ada, na ufaulu — tayari kuchapishwa.' },
  { icon: GraduationCap, title: 'Wafanyakazi na HR', desc: 'Simamia walimu na wafanyakazi, likizo, na tathmini.' }
]

const BENEFITS = [
  { icon: Zap, title: 'Haraka na Rahisi', desc: 'Imejengwa kufanya kazi haraka hata kwenye mtandao dhaifu.' },
  { icon: Globe, title: 'Kwa Lugha Yako', desc: 'Mfumo mzima uko kwa Kiswahili — rahisi kwa kila mtumiaji.' },
  { icon: Lock, title: 'Salama', desc: 'Kila mtumiaji anaona anachoruhusiwa pekee. Data yako imelindwa.' },
  { icon: Smartphone, title: 'Kwenye Simu', desc: 'Tumia kwenye kompyuta, tablet au simu — popote ulipo.' }
]

const ROLES_INFO = [
  { title: 'Mmiliki', desc: 'Mtazamo kamili wa shule pamoja na fedha na ripoti zote.' },
  { title: 'Mkuu wa Shule', desc: 'Simamia taaluma, wanafunzi, walimu, na uendeshaji wa kila siku.' },
  { title: 'Mwalimu', desc: 'Chukua mahudhurio, ingiza matokeo, na simamia madarasa yako.' },
  { title: 'Mzazi na Mwanafunzi', desc: 'Ona matokeo, mahudhurio, na taarifa za shule popote.' }
]

function Logo({ className = 'h-9 w-9' }) {
  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-xl ${className}`}>
      <img src="/brand/classlink-icon.png" alt="ClassLink" className="h-full w-full object-contain" />
    </div>
  )
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, role } = useAuth()

  // Kama umeingia, "Ingia" inakupeleka dashibodi yako moja kwa moja.
  // Kama hujaingia, inakupeleka ukurasa wa kuingia.
  let loginTo = '/ingia'
  if (isAuthenticated) {
    if (role === ROLES.SUPER_ADMIN) loginTo = '/platform'
    else if (role === ROLES.SCHOOL_OWNER || role === ROLES.SCHOOL_ADMIN || role === ROLES.TEACHER || role === ROLES.STAFF) loginTo = '/app'
    else loginTo = '/portal'
  }
  const loginLabel = isAuthenticated ? 'Nenda kwenye Dashibodi' : 'Ingia'

  return (
    <div className="min-h-screen bg-white">
      {/* ============ NAVBAR ============ */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-heading text-lg font-bold text-slate-900">ClassLink</span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#huduma" className="text-sm font-medium text-slate-600 hover:text-slate-900">Huduma</a>
            <a href="#faida" className="text-sm font-medium text-slate-600 hover:text-slate-900">Faida</a>
            <a href="#watumiaji" className="text-sm font-medium text-slate-600 hover:text-slate-900">Watumiaji</a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {!isAuthenticated && (
              <Link to={loginTo} className="text-sm font-medium text-slate-700 hover:text-slate-900">Ingia</Link>
            )}
            <Link to={loginTo}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700">
              {isAuthenticated ? 'Nenda kwenye Dashibodi' : 'Anza sasa'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button onClick={() => setMenuOpen((v) => !v)} className="rounded-lg p-2 text-slate-600 md:hidden">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#huduma" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-600">Huduma</a>
              <a href="#faida" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-600">Faida</a>
              <a href="#watumiaji" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-600">Watumiaji</a>
              <Link to={loginTo} className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white">
                Ingia <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-brand-50 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-100">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Smart School Management System
              </div>
              <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
                Endesha shule yako<br />
                <span className="text-brand-600">kwa urahisi na uweledi</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
                ClassLink ni mfumo kamili wa usimamizi wa shule — wanafunzi, mahudhurio,
                mitihani, matokeo, ada na zaidi. Yote mahali pamoja, kwa Kiswahili.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={loginTo}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md">
                  {loginLabel} <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#huduma"
                   className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50">
                  Ona huduma
                </a>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-500" /> Kwa Kiswahili</span>
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-500" /> Kwenye simu</span>
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-500" /> Salama</span>
              </div>
            </div>

            {/* Kadi ya onyesho */}
            <div className="relative">
              <div className="absolute inset-0 -rotate-6 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 opacity-10" />
              <div className="relative rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <Logo className="h-10 w-10" />
                  <div>
                    <p className="font-heading font-semibold text-slate-900">Dashibodi</p>
                    <p className="text-xs text-slate-400">Sekondari Urambo</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Wanafunzi', value: '340', tone: 'bg-brand-50 text-brand-600' },
                    { label: 'Walimu', value: '24', tone: 'bg-blue-50 text-blue-600' },
                    { label: 'Wapo leo', value: '312', tone: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Madarasa', value: '12', tone: 'bg-amber-50 text-amber-600' }
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-100 p-3">
                      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${s.tone}`}>
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                      <p className="text-xs text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Ukusanyaji wa ada</span>
                    <span className="font-semibold text-brand-600">78%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-brand-500 to-brand-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HUDUMA ============ */}
      <section id="huduma" className="border-t border-slate-100 bg-slate-50/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Kila kitu unachohitaji</h2>
            <p className="mt-4 text-lg text-slate-600">Mfumo mmoja unaokidhi mahitaji yote ya shule yako.</p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title}
                     className="group rounded-2xl border border-slate-200/70 bg-white p-6 transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100/40">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ FAIDA ============ */}
      <section id="faida" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
                Kwa nini shule zinachagua ClassLink?
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Tumeujenga mfumo kwa kuzingatia mahitaji halisi ya shule za Tanzania na Afrika Mashariki.
              </p>
              <div className="mt-8 space-y-5">
                {BENEFITS.map((b) => {
                  const Icon = b.icon
                  return (
                    <div key={b.title} className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{b.title}</h3>
                        <p className="mt-0.5 text-sm text-slate-500">{b.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white shadow-xl">
                <GraduationCap className="h-12 w-12 text-brand-200" />
                <blockquote className="mt-6 text-xl font-medium leading-relaxed">
                  "ClassLink imerahisisha uendeshaji wa shule yetu. Kila kitu tunachohitaji kiko mahali pamoja."
                </blockquote>
                <div className="mt-6 border-t border-white/20 pt-4">
                  <p className="font-semibold">Mkuu wa Shule</p>
                  <p className="text-sm text-brand-200">Shule ya Sekondari</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WATUMIAJI ============ */}
      <section id="watumiaji" className="border-t border-slate-100 bg-slate-50/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Kwa kila mtu shuleni</h2>
            <p className="mt-4 text-lg text-slate-600">Kila mtumiaji anaona anachohitaji pekee.</p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES_INFO.map((r, i) => (
              <div key={r.title} className="rounded-2xl border border-slate-200/70 bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-heading text-sm font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{r.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-8 py-14 text-center shadow-2xl sm:px-16">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Uko tayari kuanza?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
                Ingia kwenye mfumo wa ClassLink na uanze kuendesha shule yako kwa uweledi.
              </p>
              <Link to={loginTo}
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-700 shadow-lg transition-transform hover:scale-105">
                {isAuthenticated ? 'Nenda kwenye Dashibodi' : 'Ingia sasa'} <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Logo />
              <div>
                <p className="font-heading font-bold text-slate-900">ClassLink</p>
                <p className="text-xs text-slate-400">Smart School Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#huduma" className="hover:text-slate-900">Huduma</a>
              <a href="#faida" className="hover:text-slate-900">Faida</a>
              <Link to={loginTo} className="hover:text-slate-900">Ingia</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-400">
            © {new Date().getFullYear()} ClassLink · Smart School Management System
          </div>
        </div>
      </footer>
    </div>
  )
}
