import { GraduationCap, Users, School, BookOpen, UserCheck, UserX, Wallet, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRpc, useTable } from '@/hooks/useSupabaseQuery'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { formatMoney, formatNumber, formatDate } from '@/utils/format'

export default function Dashboard() {
  const { schoolId, profile, school } = useAuth()

  const { data: stats, isLoading, error } = useRpc(
    'school_dashboard_stats',
    { p_school_id: schoolId },
    { enabled: Boolean(schoolId), key: 'dashboard-stats' }
  )

  const { data: announcements = [] } = useTable('announcements', {
    order: { column: 'created_at', ascending: false }
  })

  if (isLoading) return <Spinner full />

  if (error) {
    return (
      <EmptyState
        title="Imeshindikana kupakia takwimu"
        description={error.message}
      />
    )
  }

  const s = stats || {}
  const collectionRate = s.fees_billed > 0
    ? Math.round((s.fees_collected / s.fees_billed) * 100)
    : 0

  return (
    <>
      <PageHeader
        title={`Habari, ${profile?.full_name?.split(' ')[0] || ''}`}
        subtitle={school?.name}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wanafunzi"
          value={formatNumber(s.students_total)}
          icon={GraduationCap}
          tone="blue"
          hint={`Wavulana ${s.students_male || 0} · Wasichana ${s.students_female || 0}`}
        />
        <StatCard label="Walimu" value={formatNumber(s.teachers_total)} icon={Users} tone="slate" />
        <StatCard label="Madarasa" value={formatNumber(s.classes_total)} icon={School} tone="slate" />
        <StatCard label="Masomo" value={formatNumber(s.subjects_total)} icon={BookOpen} tone="slate" />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Mahudhurio ya leo
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Wapo shuleni" value={formatNumber(s.present_today)} icon={UserCheck} tone="green" />
        <StatCard label="Hawapo" value={formatNumber(s.absent_today)} icon={UserX} tone="red" />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Ada
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Jumla ya madai" value={formatMoney(s.fees_billed)} icon={Wallet} tone="slate" />
        <StatCard label="Zimekusanywa" value={formatMoney(s.fees_collected)} icon={TrendingUp} tone="green" />
        <StatCard
          label="Kiwango cha ukusanyaji"
          value={`${collectionRate}%`}
          icon={TrendingUp}
          tone={collectionRate >= 70 ? 'green' : collectionRate >= 40 ? 'amber' : 'red'}
        />
      </div>

      <Card className="mt-8">
        <CardHeader title="Matangazo ya karibuni" />
        {announcements.length === 0 ? (
          <EmptyState title="Hakuna matangazo" description="Matangazo mapya yataonekana hapa." />
        ) : (
          <CardBody className="divide-y divide-slate-100 p-0">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="px-5 py-4">
                <p className="font-medium text-slate-900">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.body}</p>
                <p className="mt-1.5 text-xs text-slate-400">{formatDate(a.created_at)}</p>
              </div>
            ))}
          </CardBody>
        )}
      </Card>
    </>
  )
}
