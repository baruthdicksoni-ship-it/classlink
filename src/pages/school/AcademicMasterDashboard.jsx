import { useNavigate } from 'react-router-dom'
import {
  Users, GraduationCap, School, BookOpen, ClipboardCheck, FileText,
  CheckCircle2, ShieldAlert, AlertCircle, CalendarClock
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { useRpc, useTable } from '@/hooks/useSupabaseQuery'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import { StatSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Card, CardHeader } from '@/components/ui/Card'
import AlertsPanel from '@/components/shared/AlertsPanel'

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

export default function AcademicMasterDashboard() {
  const { schoolId, profile, school, can } = useAuth()

  const { data: stats, isLoading, error } = useRpc(
    'academic_master_dashboard',
    { p_school_id: schoolId },
    { enabled: Boolean(schoolId), key: 'academic-master-dashboard' }
  )

  const s = stats || {}
  const trend = (s.attendance_trend || []).map((t) => ({
    siku: t.day_label,
    Waliopo: Number(t.present) || 0,
    Hawapo: Number(t.absent) || 0
  }))

  const alerts = [
    {
      label: 'Mitihani inayosubiri kuidhinishwa',
      hint: 'Matokeo yaliyowasilishwa na walimu',
      count: s.exams_pending || 0,
      icon: CheckCircle2,
      tone: 'amber',
      to: can('exams.approve') ? '/app/exams' : null
    },
    {
      label: 'Madarasa hayajachukua mahudhurio leo',
      hint: 'Madarasa yasiyorekodi mahudhurio',
      count: s.alert_no_attendance || 0,
      icon: ClipboardCheck,
      tone: 'amber',
      to: can('attendance.view') ? '/app/attendance' : null
    },
    {
      label: 'Kesi za nidhamu zilizo wazi',
      hint: 'Kesi zinazosubiri maamuzi',
      count: s.alert_discipline_open || 0,
      icon: ShieldAlert,
      tone: 'amber',
      to: can('discipline.view') ? '/app/discipline' : null
    }
  ]

  if (isLoading) {
    return (
      <>
        <PageHeader title={`Habari, ${profile?.full_name?.split(' ')[0] || ''}`} subtitle={school?.name} />
        <StatSkeleton count={4} />
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashibodi ya Taaluma" subtitle={school?.name} />
        <Card><EmptyState icon={AlertCircle} title="Imeshindwa kupakia" description={error.message} /></Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Habari, ${profile?.full_name?.split(' ')[0] || ''}`}
        subtitle="Muhtasari wa taaluma ya shule"
      />

      {/* Takwimu za taaluma */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Wanafunzi" value={s.students_total || 0} icon={GraduationCap} tone="green" />
        <StatCard label="Walimu" value={s.teachers_total || 0} icon={Users} tone="blue" />
        <StatCard label="Madarasa" value={s.classes_total || 0} icon={School} tone="slate" />
        <StatCard label="Masomo" value={s.subjects_total || 0} icon={BookOpen} tone="amber" />
      </div>

      {/* Tahadhari */}
      <div className="mt-8">
        <AlertsPanel alerts={alerts} />
      </div>

      {/* Mwenendo wa mahudhurio */}
      <Card className="mt-8">
        <CardHeader title="Mwenendo wa mahudhurio" subtitle="Siku 7 zilizopita" />
        <div className="px-5 pb-5">
          {trend.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="Hakuna data bado"
                        description="Chati itaonekana baada ya kurekodi mahudhurio." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="clrPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="siku" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Area type="monotone" dataKey="Waliopo" stroke="#16a34a" strokeWidth={2} fill="url(#clrPresent)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Hatua za haraka */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Hatua za haraka</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {can('exams.approve') && <QuickAction icon={CheckCircle2} label="Idhinisha matokeo" to="/app/exams" />}
        {can('timetable.manage') && <QuickAction icon={CalendarClock} label="Panga ratiba" to="/app/timetable" />}
        {can('attendance.view') && <QuickAction icon={ClipboardCheck} label="Mahudhurio" to="/app/attendance" />}
        {can('reports.view') && <QuickAction icon={FileText} label="Ripoti za taaluma" to="/app/reports" />}
      </div>
    </>
  )
}
