import { useNavigate } from 'react-router-dom'
import {
  School, BookOpen, GraduationCap, Clock, ClipboardCheck,
  FileText, CalendarClock, Megaphone, ShieldAlert, AlertCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRpc, useTable } from '@/hooks/useSupabaseQuery'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import { StatSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatDate } from '@/utils/format'

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

const fmtTime = (t) => t ? t.slice(0, 5) : ''

export default function TeacherDashboard() {
  const { userId, profile, school, can } = useAuth()

  const { data: stats, isLoading, error } = useRpc(
    'teacher_dashboard',
    { p_teacher_id: userId },
    { enabled: Boolean(userId), key: 'teacher-dashboard' }
  )

  const { data: announcements = [] } = useTable('announcements', {
    order: { column: 'created_at', ascending: false }
  })

  const s = stats || {}
  const periods = s.today_periods || []

  if (isLoading) {
    return (
      <>
        <PageHeader title={`Habari, ${profile?.full_name?.split(' ')[0] || ''}`} subtitle={school?.name} />
        <StatSkeleton count={3} />
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashibodi" subtitle={school?.name} />
        <Card><EmptyState icon={AlertCircle} title="Imeshindwa kupakia" description={error.message} /></Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Habari, ${profile?.full_name?.split(' ')[0] || ''}`}
        subtitle={s.is_class_teacher ? `Mwalimu wa darasa · ${s.managed_class || ''}` : 'Mwalimu'}
      />

      {/* Takwimu za mwalimu */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Madarasa yangu" value={s.classes_count || 0} icon={School} tone="blue" />
        <StatCard label="Masomo yangu" value={s.subjects_count || 0} icon={BookOpen} tone="slate" />
        <StatCard label="Wanafunzi wangu" value={s.students_count || 0} icon={GraduationCap} tone="green" />
      </div>

      {/* Ratiba ya leo + Matangazo */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Ratiba yangu ya leo" subtitle={periods.length ? `Vipindi ${periods.length}` : undefined} />
          {periods.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Hakuna vipindi leo"
                        description="Ratiba yako ya leo itaonekana hapa." />
          ) : (
            <div className="divide-y divide-slate-50">
              {periods.map((p, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-brand-50 py-1.5">
                    <span className="text-xs font-bold text-brand-700">{fmtTime(p.start_time)}</span>
                    <span className="text-[10px] text-brand-500">{fmtTime(p.end_time)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{p.subject || 'Kipindi'}</p>
                    <p className="text-sm text-slate-500">{p.class_name}{p.room ? ` · ${p.room}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Matangazo */}
        <Card>
          <CardHeader title="Matangazo" />
          {announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="Hakuna matangazo" description="Matangazo yataonekana hapa." />
          ) : (
            <div className="divide-y divide-slate-50">
              {announcements.slice(0, 4).map((a) => (
                <div key={a.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatDate(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Hatua za haraka */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Hatua za haraka</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {can('attendance.record') && <QuickAction icon={ClipboardCheck} label="Chukua mahudhurio" to="/app/attendance" />}
        {can('results.enter') && <QuickAction icon={FileText} label="Ingiza matokeo" to="/app/results" />}
        {can('timetable.view') && <QuickAction icon={CalendarClock} label="Ratiba yangu" to="/app/timetable" />}
        {can('discipline.report') && <QuickAction icon={ShieldAlert} label="Ripoti nidhamu" to="/app/discipline" />}
      </div>
    </>
  )
}
