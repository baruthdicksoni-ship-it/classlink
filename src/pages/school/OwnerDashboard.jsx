import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Wallet, Users, GraduationCap, Receipt,
  ArrowUpRight, ArrowDownRight, AlertCircle, PiggyBank, Percent, UserPlus
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { useRpc } from '@/hooks/useSupabaseQuery'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import { StatSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatMoney } from '@/utils/format'

export default function OwnerDashboard() {
  const { schoolId, profile, school } = useAuth()

  const { data: stats, isLoading, error } = useRpc(
    'owner_dashboard',
    { p_school_id: schoolId },
    { enabled: Boolean(schoolId), key: 'owner-dashboard' }
  )

  const s = stats || {}
  const profitMonth = (Number(s.income_month) || 0) - (Number(s.expenses_month) || 0)
  const profitYear = (Number(s.income_year) || 0) - (Number(s.expenses_year) || 0)

  const financeTrend = useMemo(() => (s.finance_trend || []).map((t) => ({
    mwezi: t.month_label,
    Mapato: Number(t.mapato) || 0,
    Matumizi: Number(t.matumizi) || 0
  })), [s.finance_trend])

  const enrollTrend = useMemo(() => (s.enrollment_trend || []).map((t) => ({
    mwezi: t.month_label,
    Wapya: Number(t.wapya) || 0
  })), [s.enrollment_trend])

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
        <PageHeader title="Dashibodi ya Biashara" subtitle={school?.name} />
        <Card><EmptyState icon={AlertCircle} title="Imeshindwa kupakia" description={error.message} /></Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Habari, ${profile?.full_name?.split(' ')[0] || ''}`}
        subtitle="Muhtasari wa biashara ya shule"
      />

      {/* Faida na fedha - mwezi huu */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Mapato mwezi huu" value={formatMoney(s.income_month)} icon={ArrowUpRight} tone="green" />
        <StatCard label="Matumizi mwezi huu" value={formatMoney(s.expenses_month)} icon={ArrowDownRight} tone="red" />
        <StatCard label="Faida mwezi huu" value={formatMoney(profitMonth)} icon={PiggyBank}
                  tone={profitMonth >= 0 ? 'green' : 'red'} />
        <StatCard label="Kiwango cha ukusanyaji" value={`${s.collection_rate || 0}%`} icon={Percent} tone="blue" />
      </div>

      {/* Ada na watu */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ada iliyokusanywa" value={formatMoney(s.fees_collected)} icon={Wallet} tone="green" />
        <StatCard label="Ada inayodaiwa" value={formatMoney(s.fees_outstanding)} icon={Receipt} tone="amber" />
        <StatCard label="Wanafunzi" value={s.students_total || 0} icon={GraduationCap} tone="blue" />
        <StatCard label="Watumishi" value={s.staff_total || 0} icon={Users} tone="slate" />
      </div>

      {/* Chart: mapato dhidi ya matumizi */}
      <Card className="mt-8">
        <CardHeader title="Mapato dhidi ya Matumizi" subtitle={`Miezi 6 · Faida ya mwaka: ${formatMoney(profitYear)}`} />
        <div className="px-5 pb-5">
          {financeTrend.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Hakuna data bado"
                        description="Chati itaonekana baada ya kurekodi mapato na matumizi." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={financeTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mwezi" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                       tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip formatter={(v) => formatMoney(v)}
                         contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="Mapato" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Matumizi" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Chart: ukuaji wa wanafunzi */}
      <Card className="mt-6">
        <CardHeader title="Ukuaji wa Usajili" subtitle="Wanafunzi wapya kwa mwezi" />
        <div className="px-5 pb-5">
          {enrollTrend.length === 0 ? (
            <EmptyState icon={UserPlus} title="Hakuna data bado"
                        description="Ukuaji utaonekana wanafunzi wapya wanaposajiliwa." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={enrollTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ownGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mwezi" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Area type="monotone" dataKey="Wapya" stroke="#3b82f6" strokeWidth={2} fill="url(#ownGrowth)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </>
  )
}
