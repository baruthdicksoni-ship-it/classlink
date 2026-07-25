import { Building2, Users, GraduationCap, CheckCircle2 } from 'lucide-react'
import { useTable } from '@/hooks/useSupabaseQuery'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import Spinner from '@/components/ui/Spinner'
import { Card, CardHeader } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import { formatDate, formatNumber } from '@/utils/format'

export default function PlatformDashboard() {
  const { data: schools = [], isLoading } = useTable('schools', {
    scopeToSchool: false,
    order: { column: 'created_at', ascending: false }
  })
  const { data: profiles = [] } = useTable('profiles', {
    select: 'id, role',
    scopeToSchool: false
  })

  if (isLoading) return <Spinner full />

  const active = schools.filter((s) => s.is_active).length
  const students = profiles.filter((p) => p.role === 'student').length

  return (
    <>
      <PageHeader title="Dashibodi ya Jukwaa" subtitle="Muhtasari wa shule zote" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Shule zote" value={formatNumber(schools.length)} icon={Building2} tone="blue" />
        <StatCard label="Zinazofanya kazi" value={formatNumber(active)} icon={CheckCircle2} tone="green" />
        <StatCard label="Watumiaji" value={formatNumber(profiles.length)} icon={Users} tone="slate" />
        <StatCard label="Wanafunzi" value={formatNumber(students)} icon={GraduationCap} tone="slate" />
      </div>

      <Card className="mt-8">
        <CardHeader title="Shule zilizosajiliwa karibuni" />
        <Table>
          <THead columns={[
            { label: 'Shule' }, { label: 'Mkoa' }, { label: 'Kifurushi' },
            { label: 'Hali' }, { label: 'Tarehe' }
          ]} />
          <TBody>
            {schools.slice(0, 10).map((s) => (
              <TR key={s.id}>
                <TD className="font-medium text-slate-900">{s.name}</TD>
                <TD>{s.region || '—'}</TD>
                <TD className="uppercase text-xs">{s.subscription_plan}</TD>
                <TD>
                  <Badge tone={s.is_active ? 'green' : 'red'}>
                    {s.is_active ? 'Hai' : 'Imesimamishwa'}
                  </Badge>
                </TD>
                <TD className="text-xs">{formatDate(s.created_at)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </>
  )
}
