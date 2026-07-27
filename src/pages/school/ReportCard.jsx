import { useState } from 'react'
import { Printer, FileText, GraduationCap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTable } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { fullName, formatDate } from '@/utils/format'

export default function ReportCard() {
  const { schoolId } = useAuth()
  const toast = useToast()

  const [examId, setExamId] = useState('')
  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(false)

  const { data: exams = [] } = useTable('exams', { order: { column: 'created_at', ascending: false } })
  const { data: classes = [] } = useTable('classes', { order: { column: 'name', ascending: true } })
  const { data: students = [] } = useTable('students', {
    select: 'id, admission_no, first_name, middle_name, last_name',
    filters: { class_id: classId, status: 'active' },
    order: { column: 'first_name', ascending: true },
    enabled: Boolean(classId)
  })

  async function loadCard() {
    if (!studentId || !examId) return
    setLoading(true)
    setCard(null)
    const { data, error } = await supabase.rpc('student_report_card', {
      p_student_id: studentId,
      p_exam_id: examId
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    if (!data?.results || data.results.length === 0) {
      toast.error('Mwanafunzi huyu hana matokeo kwenye mtihani huu.')
      return
    }
    setCard(data)
  }

  return (
    <>
      <PageHeader
        title="Report Card"
        subtitle="Chagua mtihani, darasa na mwanafunzi kuona ripoti"
        action={card && (
          <Button icon={Printer} onClick={() => window.print()} className="print:hidden">Chapisha</Button>
        )}
      />

      {/* Vichujio — vinafichwa wakati wa kuchapisha */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4 print:hidden">
        <Select label="Mtihani" value={examId} onChange={(e) => { setExamId(e.target.value); setCard(null) }}
                placeholder="Chagua mtihani" options={exams.map((x) => ({ value: x.id, label: x.name }))} />
        <Select label="Darasa" value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(''); setCard(null) }}
                placeholder="Chagua darasa"
                options={classes.map((c) => ({ value: c.id, label: c.stream ? `${c.name} ${c.stream}` : c.name }))} />
        <Select label="Mwanafunzi" value={studentId} onChange={(e) => { setStudentId(e.target.value); setCard(null) }}
                placeholder="Chagua mwanafunzi" disabled={!classId}
                options={students.map((s) => ({ value: s.id, label: fullName(s) }))} />
        <div className="flex items-end">
          <Button onClick={loadCard} loading={loading} disabled={!studentId || !examId} className="w-full">
            Onyesha ripoti
          </Button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : !card ? (
        <Card>
          <EmptyState icon={FileText} title="Chagua vigezo"
                      description="Chagua mtihani, darasa na mwanafunzi kisha bofya “Onyesha ripoti”." />
        </Card>
      ) : (
        <ReportCardView card={card} />
      )}
    </>
  )
}

// Muonekano wa report card — umeboreshwa kwa kuchapisha
function ReportCardView({ card }) {
  const { student, exam, school, results, summary } = card

  return (
    <div className="card mx-auto max-w-3xl overflow-hidden print:border-0 print:shadow-none">
      {/* Kichwa */}
      <div className="border-b border-slate-200 bg-slate-50 px-8 py-6 text-center print:bg-white">
        <div className="mb-2 flex items-center justify-center gap-3">
          {school.logo_url ? (
            <img src={school.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-600">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        <h1 className="text-xl font-bold text-slate-900">{school.name}</h1>
        {school.motto && <p className="mt-0.5 text-sm italic text-slate-500">{school.motto}</p>}
        <p className="mt-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          {exam.name}
        </p>
      </div>

      {/* Taarifa za mwanafunzi */}
      <div className="grid grid-cols-2 gap-4 border-b border-slate-200 px-8 py-5 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">Jina</p>
          <p className="font-medium text-slate-900">{student.name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Namba</p>
          <p className="font-medium text-slate-900">{student.admission_no}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Darasa</p>
          <p className="font-medium text-slate-900">{student.class || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Jinsia</p>
          <p className="font-medium text-slate-900">{student.gender === 'male' ? 'Mume' : 'Mke'}</p>
        </div>
      </div>

      {/* Matokeo */}
      <div className="px-8 py-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-2 font-semibold text-slate-600">Somo</th>
              <th className="pb-2 text-center font-semibold text-slate-600">Alama</th>
              <th className="pb-2 text-center font-semibold text-slate-600">Daraja</th>
              <th className="pb-2 font-semibold text-slate-600">Maoni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r, i) => (
              <tr key={i}>
                <td className="py-2.5 font-medium text-slate-800">{r.subject}</td>
                <td className="py-2.5 text-center tabular-nums text-slate-700">{r.marks ?? '—'}</td>
                <td className="py-2.5 text-center">
                  {r.grade && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.grade === 'F' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'
                    }`}>{r.grade}</span>
                  )}
                </td>
                <td className="py-2.5 text-slate-500">{r.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Muhtasari */}
      <div className="grid grid-cols-3 gap-4 border-t border-slate-200 bg-slate-50 px-8 py-5 print:bg-white">
        <div className="text-center">
          <p className="text-xs text-slate-400">Jumla ya alama</p>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{summary.total}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">Wastani</p>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{summary.average}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">Masomo</p>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{summary.subjects_count}</p>
        </div>
      </div>

      {/* Sahihi */}
      <div className="flex justify-between gap-8 px-8 py-8 text-sm">
        <div className="flex-1">
          <div className="border-t border-slate-300 pt-1 text-center text-xs text-slate-500">Sahihi ya Mwalimu wa Darasa</div>
        </div>
        <div className="flex-1">
          <div className="border-t border-slate-300 pt-1 text-center text-xs text-slate-500">Sahihi ya Mkuu wa Shule</div>
        </div>
      </div>
    </div>
  )
}
