import { useEffect, useState } from 'react'
import { GraduationCap, ClipboardCheck, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { fullName, formatMoney, STUDENT_STATUS } from '@/utils/format'

export default function PortalDashboard() {
  const { profile, school } = useAuth()
  const [students, setStudents] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // RLS inachuja tayari — hatuhitaji kuchuja hapa
      const [{ data: st }, { data: inv }] = await Promise.all([
        supabase.from('students').select('id, admission_no, first_name, middle_name, last_name, status, class_id'),
        supabase.from('fee_invoices').select('id, invoice_no, total_amount, paid_amount, status, student_id')
      ])
      if (cancelled) return
      setStudents(st || [])
      setInvoices(inv || [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <Spinner full />

  const balance = invoices.reduce(
    (a, i) => a + (Number(i.total_amount) - Number(i.paid_amount)), 0
  )

  return (
    <>
      <PageHeader
        title={`Karibu, ${profile?.full_name?.split(' ')[0] || ''}`}
        subtitle={school?.name}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Wanafunzi" value={students.length} icon={GraduationCap} tone="blue" />
        <StatCard
          label="Deni la ada"
          value={formatMoney(balance)}
          icon={Wallet}
          tone={balance > 0 ? 'red' : 'green'}
        />
      </div>

      <Card className="mt-6">
        <CardHeader title="Wanafunzi wako" />
        {students.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Hakuna mwanafunzi aliyeunganishwa"
            description="Wasiliana na shule ili kuunganisha akaunti yako na mwanafunzi."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((s) => {
              const st = STUDENT_STATUS[s.status] || { label: s.status, tone: 'slate' }
              return (
                <div key={s.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-900">{fullName(s)}</p>
                    <p className="font-mono text-xs text-slate-400">{s.admission_no}</p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </>
  )
}
