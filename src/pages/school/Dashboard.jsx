import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, Users, School, BookOpen, UserCheck, UserX,
  Wallet, TrendingUp, CalendarClock, FileText, ClipboardCheck,
  Megaphone, Plus, AlertCircle, ShieldAlert, CalendarDays, Package
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { useRpc, useTable } from '@/hooks/useSupabaseQuery'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import AlertsPanel from '@/components/shared/AlertsPanel'
import { StatSkeleton } from '@/components/ui/Skeleton'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatMoney, formatNumber, formatDate } from '@/utils/format'

// Kitufe cha hatua ya haraka
function QuickAction({ icon: Icon, label, to }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="card flex items-center gap-3 p-4 text-left transition-all hover:border-brand-300 hover:shadow-md hover:shadow-brand-100/50"
    >
      <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </button>
  )
}

import TeacherDashboard from './TeacherDashboard'
import AccountantDashboard from './AccountantDashboard'

export default function Dashboard() {
  const { role } = useAuth()
  // Kila cheo na dashibodi yake
  if (role === 'teacher' || role === 'staff') {
    return <TeacherDashboard />
  }
  if (role === 'accountant') {
    return <AccountantDashboard />
  }
  return <HeadDashboard />
}

function HeadDashboard() {
  const { schoolId, profile, school, can } = useAuth()

  const { data: stats, isLoading, error } = useRpc(
    'head_dashboard',
    { p_school_id: schoolId },
    { enabled: Boolean(schoolId), key: 'head-dashboard' }
  )

  const { data: announcements = [] } = useTable('announcements', {
    order: { column: 'created_at', ascending: false }
  })

  const { data: allEvents = [] } = useTable('calendar_events', {
    order: { column: 'start_date', ascending: true }
  })

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return allEvents.filter((e) => (e.end_date || e.start_date) >= today).slice(0, 4)
  }, [allEvents])

  const s = stats || {}

  // Kiwango cha mahudhurio
  const attendanceRate = s.marked_today > 0
    ? Math.round((s.present_today / s.marked_today) * 100)
    : null

  const collectionRate = s.fees_billed > 0
    ? Math.round((s.fees_collected / s.fees_billed) * 100)
    : 0

  // Tahadhari
  const alerts = useMemo(() => [
    {
      label: 'Ada zilizopita muda',
      hint: 'Wanafunzi wenye deni lililopita tarehe',
      count: s.alert_unpaid || 0,
      icon: Wallet,
      tone: 'red',
      to: can('fees.view') ? '/app/fees' : null
    },
    {
      label: 'Matokeo hayajatangazwa',
      hint: 'Mitihani yenye matokeo yasiyotangazwa',
      count: s.alert_exams_unpublished || 0,
      icon: FileText,
      tone: 'amber',
      to: '/app/exams'
    },
    {
      label: 'Madarasa hayajachukuliwa mahudhurio',
      hint: 'Madarasa bila mahudhurio ya leo',
      count: s.alert_no_attendance_today || 0,
      icon: ClipboardCheck,
      tone: 'amber',
      to: '/app/attendance'
    },
    {
      label: 'Kesi za nidhamu zilizo wazi',
      hint: 'Kesi zinazosubiri maamuzi',
      count: s.alert_discipline_open || 0,
      icon: ShieldAlert,
      tone: 'amber',
      to: can('discipline.view') ? '/app/discipline' : null
    },
    {
      label: 'Vifaa vyenye stock ndogo',
      hint: 'Vifaa vilivyofikia kiwango cha chini',
      count: s.alert_low_stock || 0,
      icon: Package,
      tone: 'amber',
      to: can('inventory.view') ? '/app/inventory' : null
    }
  ], [s, can])

  // Grafu ya mahudhurio
  const trend = (s.attendance_trend || []).map((d) => ({
    day: d.day_label,
    Wapo: d.present,
    Hawapo: d.absent
  }))

  if (isLoading) {
    return (
      <>
        <PageHeader title="Dashibodi" subtitle={school?.name} />
        <StatSkeleton count={4} />
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashibodi" subtitle={school?.name} />
        <Card>
          <EmptyState icon={AlertCircle} title="Imeshindwa kupakia takwimu" description={error.message} />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Habari, ${profile?.full_name?.split(' ')[0] || ''}`}
        subtitle={school?.name}
      />

      {/* Takwimu kuu */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wanafunzi"
          value={formatNumber(s.students_total)}
          icon={GraduationCap}
          tone="blue"
          hint={`Wavulana ${s.students_male || 0} · Wasichana ${s.students_female || 0}`}
        />
        <StatCard
          label="Wafanyakazi"
          value={formatNumber(s.staff_total)}
          icon={Users}
          tone="slate"
          hint={`Walimu ${s.teachers_total || 0}`}
        />
        <StatCard label="Madarasa" value={formatNumber(s.classes_total)} icon={School} tone="slate" />
        <StatCard label="Masomo" value={formatNumber(s.subjects_total)} icon={BookOpen} tone="slate" />
      </div>

      {/* Mahudhurio ya leo */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Mahudhurio ya leo
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Wapo shuleni"
          value={formatNumber(s.present_today)}
          icon={UserCheck}
          tone="green"
          hint={attendanceRate !== null ? `${attendanceRate}% ya waliohudhuriwa` : 'Bado hakujachukuliwa'}
        />
        <StatCard label="Hawapo" value={formatNumber(s.absent_today)} icon={UserX} tone="red" />
        <StatCard label="Wamechelewa" value={formatNumber(s.late_today)} icon={CalendarClock} tone="amber" />
      </div>

      {/* Grafu + Tahadhari */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Mwenendo wa mahudhurio" subtitle="Siku 7 zilizopita" />
          <div className="p-5 pt-2">
            {trend.some((d) => d.Wapo > 0 || d.Hawapo > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trend} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gWapo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  />
                  <Area type="monotone" dataKey="Wapo" stroke="#10b981" strokeWidth={2.5} fill="url(#gWapo)" />
                  <Area type="monotone" dataKey="Hawapo" stroke="#ef4444" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-slate-400">
                Hakuna data ya mahudhurio bado
              </div>
            )}
          </div>
        </Card>

        <AlertsPanel alerts={alerts} />
      </div>

      {/* Ada (view) */}
      {can('fees.view') && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Ada</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Mapato ya leo" value={formatMoney(s.fees_today)} icon={TrendingUp} tone="green" />
            <StatCard label="Mapato ya mwezi" value={formatMoney(s.fees_month)} icon={Wallet} tone="blue" />
            <StatCard label="Zimekusanywa" value={`${collectionRate}%`} icon={TrendingUp}
                      tone={collectionRate >= 70 ? 'green' : collectionRate >= 40 ? 'amber' : 'red'}
                      hint={formatMoney(s.fees_collected)} />
            <StatCard label="Wanaodaiwa" value={formatNumber(s.debtors_count)} icon={UserX}
                      tone={s.debtors_count > 0 ? 'amber' : 'slate'} />
          </div>
        </>
      )}

      {/* Hatua za haraka */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Hatua za haraka</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {can('students.create') && <QuickAction icon={Plus} label="Sajili mwanafunzi" to="/app/students" />}
        {can('attendance.record') && <QuickAction icon={ClipboardCheck} label="Chukua mahudhurio" to="/app/attendance" />}
        {can('results.enter') && <QuickAction icon={FileText} label="Ingiza matokeo" to="/app/results" />}
        {can('announcements.create') && <QuickAction icon={Megaphone} label="Andika tangazo" to="/app/announcements" />}
      </div>

      {/* Matangazo + Matukio yajayo */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Matangazo ya karibuni" />
          {announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="Hakuna matangazo" description="Matangazo mapya yataonekana hapa." />
          ) : (
            <div className="divide-y divide-slate-50">
              {announcements.slice(0, 5).map((a) => (
                <div key={a.id} className="px-5 py-4">
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.body}</p>
                  <p className="mt-1.5 text-xs text-slate-400">{formatDate(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Matukio yajayo" />
          {upcomingEvents.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Hakuna matukio yajayo" description="Matukio ya kalenda yataonekana hapa." />
          ) : (
            <div className="divide-y divide-slate-50">
              {upcomingEvents.map((e) => {
                const d = new Date(e.start_date)
                return (
                  <div key={e.id} className="flex items-start gap-3 px-5 py-4">
                    <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-brand-50 py-1.5">
                      <span className="text-[10px] font-medium uppercase text-brand-500">{MONTHS_SHORT[d.getMonth()]}</span>
                      <span className="text-base font-bold text-brand-700">{d.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{e.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{EVENT_LABELS[e.category] || 'Tukio'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des']
const EVENT_LABELS = { exam: 'Mtihani', holiday: 'Likizo', meeting: 'Mkutano', event: 'Tukio', other: 'Nyingine' }
