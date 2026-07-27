import { useState } from 'react'
import { Printer, FileBarChart, ClipboardCheck, Wallet, GraduationCap, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTable } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatMoney, formatDate } from '@/utils/format'

const TYPES = [
  { id: 'attendance', label: 'Mahudhurio', icon: ClipboardCheck, perm: 'reports.view' },
  { id: 'fees',       label: 'Ada',        icon: Wallet,          perm: 'fees.view' },
  { id: 'students',   label: 'Wanafunzi',  icon: GraduationCap,   perm: 'reports.view' },
  { id: 'results',    label: 'Matokeo',    icon: BarChart3,       perm: 'reports.view' }
]

export default function Reports() {
  const { schoolId, can } = useAuth()
  const toast = useToast()

  const [type, setType] = useState('attendance')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  // Vichujio
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [classId, setClassId] = useState('')
  const [examId, setExamId] = useState('')

  const { data: classes = [] } = useTable('classes', { order: { column: 'name', ascending: true } })
  const { data: exams = [] } = useTable('exams', { order: { column: 'created_at', ascending: false } })

  const available = TYPES.filter((t) => can(t.perm))

  async function generate() {
    setLoading(true)
    setData(null)
    let res
    if (type === 'attendance') {
      res = await supabase.rpc('report_attendance', {
        p_school_id: schoolId, p_from: from, p_to: to, p_class_id: classId || null
      })
    } else if (type === 'fees') {
      res = await supabase.rpc('report_fees', { p_school_id: schoolId })
    } else if (type === 'students') {
      res = await supabase.rpc('report_students', { p_school_id: schoolId, p_class_id: classId || null })
    } else if (type === 'results') {
      if (!examId || !classId) { setLoading(false); toast.error('Chagua mtihani na darasa.'); return }
      res = await supabase.rpc('report_results', { p_school_id: schoolId, p_exam_id: examId, p_class_id: classId })
    }
    setLoading(false)
    if (res.error) { toast.error(res.error.message); return }
    setData(res.data)
  }

  return (
    <>
      <PageHeader
        title="Ripoti"
        subtitle="Toa ripoti za muhtasari za shule"
        action={data && <Button icon={Printer} onClick={() => window.print()} className="print:hidden">Chapisha</Button>}
      />

      {/* Chagua aina */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
        {available.map((t) => {
          const Icon = t.icon
          const active = type === t.id
          return (
            <button
              key={t.id}
              onClick={() => { setType(t.id); setData(null) }}
              className={`card flex items-center gap-3 p-4 text-left transition-all ${
                active ? 'border-brand-400 ring-1 ring-brand-400' : 'hover:border-slate-300'
              }`}
            >
              <div className={`rounded-xl p-2 ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-sm font-medium ${active ? 'text-brand-700' : 'text-slate-700'}`}>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Vichujio kulingana na aina */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4 print:hidden">
        {type === 'attendance' && (
          <>
            <Input label="Kuanzia" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="Hadi" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Select label="Darasa" value={classId} onChange={(e) => setClassId(e.target.value)}
                    placeholder="Madarasa yote"
                    options={classes.map((c) => ({ value: c.id, label: c.stream ? `${c.name} ${c.stream}` : c.name }))} />
          </>
        )}
        {type === 'students' && (
          <Select label="Darasa" value={classId} onChange={(e) => setClassId(e.target.value)}
                  placeholder="Madarasa yote"
                  options={classes.map((c) => ({ value: c.id, label: c.stream ? `${c.name} ${c.stream}` : c.name }))} />
        )}
        {type === 'results' && (
          <>
            <Select label="Mtihani" value={examId} onChange={(e) => setExamId(e.target.value)}
                    placeholder="Chagua mtihani" options={exams.map((x) => ({ value: x.id, label: x.name }))} />
            <Select label="Darasa" value={classId} onChange={(e) => setClassId(e.target.value)}
                    placeholder="Chagua darasa"
                    options={classes.map((c) => ({ value: c.id, label: c.stream ? `${c.name} ${c.stream}` : c.name }))} />
          </>
        )}
        <div className="flex items-end">
          <Button onClick={generate} loading={loading} className="w-full">Toa ripoti</Button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : !data ? (
        <Card>
          <EmptyState icon={FileBarChart} title="Chagua vigezo na bofya “Toa ripoti”"
                      description="Ripoti itaonekana hapa, tayari kuchapishwa." />
        </Card>
      ) : (
        <div className="card p-6 sm:p-8 print:border-0 print:shadow-none">
          {type === 'attendance' && <AttendanceReport data={data} from={from} to={to} />}
          {type === 'fees' && <FeesReport data={data} />}
          {type === 'students' && <StudentsReport data={data} />}
          {type === 'results' && <ResultsReport data={data} />}
        </div>
      )}
    </>
  )
}

function ReportTitle({ title, subtitle }) {
  return (
    <div className="mb-6 border-b border-slate-200 pb-4">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}

function StatRow({ items }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl bg-slate-50 p-4 text-center print:bg-white print:ring-1 print:ring-slate-200">
          <p className="text-xs text-slate-400">{it.label}</p>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{it.value}</p>
        </div>
      ))}
    </div>
  )
}

function AttendanceReport({ data, from, to }) {
  const s = data.summary || {}
  return (
    <>
      <ReportTitle title="Ripoti ya Mahudhurio" subtitle={`${formatDate(from)} — ${formatDate(to)}`} />
      <StatRow items={[
        { label: 'Wapo', value: s.present || 0 },
        { label: 'Hawapo', value: s.absent || 0 },
        { label: 'Wamechelewa', value: s.late || 0 },
        { label: 'Jumla', value: s.total || 0 }
      ]} />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="pb-2 font-semibold text-slate-600">Mwanafunzi</th>
            <th className="pb-2 text-center font-semibold text-slate-600">Wapo</th>
            <th className="pb-2 text-center font-semibold text-slate-600">Hawapo</th>
            <th className="pb-2 text-center font-semibold text-slate-600">Chelewa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {(data.by_student || []).map((r, i) => (
            <tr key={i}>
              <td className="py-2 font-medium text-slate-800">{r.name}</td>
              <td className="py-2 text-center tabular-nums text-emerald-600">{r.present}</td>
              <td className="py-2 text-center tabular-nums text-red-600">{r.absent}</td>
              <td className="py-2 text-center tabular-nums text-amber-600">{r.late}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function FeesReport({ data }) {
  const s = data.summary || {}
  return (
    <>
      <ReportTitle title="Ripoti ya Ada" />
      <StatRow items={[
        { label: 'Jumla ya madai', value: formatMoney(s.billed) },
        { label: 'Zimekusanywa', value: formatMoney(s.collected) },
        { label: 'Deni', value: formatMoney(s.balance) },
        { label: 'Wanaodaiwa', value: (data.debtors || []).length }
      ]} />
      <h3 className="mb-3 font-semibold text-slate-800">Wanaodaiwa</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="pb-2 font-semibold text-slate-600">Mwanafunzi</th>
            <th className="pb-2 font-semibold text-slate-600">Ankara</th>
            <th className="pb-2 text-right font-semibold text-slate-600">Deni</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {(data.debtors || []).map((r, i) => (
            <tr key={i}>
              <td className="py-2 font-medium text-slate-800">{r.name}</td>
              <td className="py-2 font-mono text-xs text-slate-500">{r.invoice_no}</td>
              <td className="py-2 text-right tabular-nums text-red-600">{formatMoney(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function StudentsReport({ data }) {
  const s = data.summary || {}
  return (
    <>
      <ReportTitle title="Ripoti ya Wanafunzi" />
      <StatRow items={[
        { label: 'Jumla', value: s.total || 0 },
        { label: 'Wavulana', value: s.male || 0 },
        { label: 'Wasichana', value: s.female || 0 }
      ]} />
      <h3 className="mb-3 font-semibold text-slate-800">Kwa darasa</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="pb-2 font-semibold text-slate-600">Darasa</th>
            <th className="pb-2 text-center font-semibold text-slate-600">Wavulana</th>
            <th className="pb-2 text-center font-semibold text-slate-600">Wasichana</th>
            <th className="pb-2 text-center font-semibold text-slate-600">Jumla</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {(data.by_class || []).map((r, i) => (
            <tr key={i}>
              <td className="py-2 font-medium text-slate-800">{r.class_name}</td>
              <td className="py-2 text-center tabular-nums">{r.male}</td>
              <td className="py-2 text-center tabular-nums">{r.female}</td>
              <td className="py-2 text-center font-semibold tabular-nums">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function ResultsReport({ data }) {
  const s = data.summary || {}
  return (
    <>
      <ReportTitle title="Ripoti ya Matokeo" subtitle={`${data.exam?.name || ''} · ${data.class || ''}`} />
      <StatRow items={[
        { label: 'Wanafunzi', value: s.students || 0 },
        { label: 'Wastani wa darasa', value: s.class_average || 0 }
      ]} />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="pb-2 text-center font-semibold text-slate-600">Nafasi</th>
            <th className="pb-2 font-semibold text-slate-600">Mwanafunzi</th>
            <th className="pb-2 text-center font-semibold text-slate-600">Jumla</th>
            <th className="pb-2 text-center font-semibold text-slate-600">Wastani</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {(data.ranking || []).map((r, i) => (
            <tr key={i}>
              <td className="py-2 text-center font-semibold tabular-nums text-slate-500">{r.position}</td>
              <td className="py-2 font-medium text-slate-800">{r.name}</td>
              <td className="py-2 text-center tabular-nums">{r.total}</td>
              <td className="py-2 text-center tabular-nums">{r.average}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
