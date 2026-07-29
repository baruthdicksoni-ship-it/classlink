import {
  Wallet, TrendingUp, TrendingDown, Receipt, Users, ArrowUpRight,
  ArrowDownRight, AlertCircle, Plus, FileText
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { useRpc } from '@/hooks/useSupabaseQuery'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import { StatSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatMoney } from '@/utils/format'

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

export default function AccountantDashboard() {
  const { schoolId, profile, school, can } = useAuth()

  const { data: stats, isLoading, error } = useRpc(
    'accountant_dashboard',
    { p_school_id: schoolId },
    { enabled: Boolean(schoolId), key: 'accountant-dashboard' }
  )

  const s = stats || {}
  const trend = (s.trend || []).map((t) => ({
    mwezi: t.month_label,
    Mapato: Number(t.income) || 0,
    Matumizi: Number(t.expense) || 0
  }))

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
        <PageHeader title="Dashibodi ya Fedha" subtitle={school?.name} />
        <Card><EmptyState icon={AlertCircle} title="Imeshindwa kupakia" description={error.message} /></Card>
      </>
    )
  }

  const net = Number(s.net_month) || 0

  return (
    <>
      <PageHeader
        title={`Habari, ${profile?.full_name?.split(' ')[0] || ''}`}
        subtitle="Muhtasari wa fedha za shule"
      />

      {/* Takwimu kuu */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Imekusanywa mwezi huu" value={formatMoney(s.collected_month)} icon={TrendingUp} tone="green" />
        <StatCard label="Matumizi mwezi huu" value={formatMoney(s.expenses_month)} icon={TrendingDown} tone="red" />
        <StatCard label="Salio (mapato - matumizi)" value={formatMoney(net)} icon={Wallet}
                  tone={net >= 0 ? 'green' : 'red'} />
        <StatCard label="Wanaodaiwa" value={s.debtors_count || 0} icon={Users} tone="amber" />
      </div>

      {/* Takwimu za ziada */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Jumla ya ada iliyotozwa" value={formatMoney(s.fees_billed)} icon={Receipt} tone="blue" />
        <StatCard label="Jumla iliyokusanywa" value={formatMoney(s.fees_collected)} icon={ArrowUpRight} tone="green" />
        <StatCard label="Bakaa ya ada" value={formatMoney(s.fees_balance)} icon={ArrowDownRight} tone="amber" />
      </div>

      {/* Chart: mapato dhidi ya matumizi */}
      <Card className="mt-8">
        <CardHeader title="Mapato dhidi ya Matumizi" subtitle="Miezi 6 iliyopita" />
        <div className="px-5 pb-5">
          {trend.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Hakuna data bado"
                        description="Chati itaonekana baada ya kurekodi mapato na matumizi." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mwezi" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                       tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip
                  formatter={(v) => formatMoney(v)}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="Mapato" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Matumizi" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Hatua za haraka */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Hatua za haraka</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {can('fees.collect') && <QuickAction icon={Wallet} label="Pokea malipo" to="/app/fees" />}
        {can('fees.manage') && <QuickAction icon={Receipt} label="Tengeneza ankara" to="/app/fees" />}
        {can('expenses.manage') && <QuickAction icon={Plus} label="Ongeza matumizi" to="/app/expenses" />}
        {can('reports.view') && <QuickAction icon={FileText} label="Ripoti za fedha" to="/app/reports" />}
      </div>
    </>
  )
}
