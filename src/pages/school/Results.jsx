import { useState, useEffect, useMemo } from 'react'
import { Save, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, translateError } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { fullName } from '@/utils/format'

export default function Results() {
  const { schoolId, profile, can } = useAuth()
  const toast = useToast()

  const [examId, setExamId] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [marks, setMarks] = useState({})
  const [loadingMarks, setLoadingMarks] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: exams = [] } = useTable('exams', { order: { column: 'created_at', ascending: false } })
  const { data: classes = [] } = useTable('classes', { order: { column: 'name', ascending: true } })
  const { data: subjects = [] } = useTable('subjects', { order: { column: 'name', ascending: true } })
  const { data: scales = [] } = useTable('grade_scales', { order: { column: 'min_marks', ascending: false } })

  const { data: students = [], isLoading } = useTable('students', {
    select: 'id, admission_no, first_name, middle_name, last_name',
    filters: { class_id: classId, status: 'active' },
    order: { column: 'first_name', ascending: true },
    enabled: Boolean(classId)
  })

  const exam = exams.find((e) => e.id === examId)
  const maxMarks = exam?.max_marks || 100
  const ready = examId && classId && subjectId

  // Pakia matokeo yaliyopo
  useEffect(() => {
    if (!ready || students.length === 0) { setMarks({}); return }

    let cancelled = false
    setLoadingMarks(true)

    supabase
      .from('results')
      .select('student_id, marks')
      .eq('exam_id', examId)
      .eq('subject_id', subjectId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { toast.error(translateError(error)); setLoadingMarks(false); return }
        const existing = Object.fromEntries((data || []).map((r) => [r.student_id, r.marks]))
        const initial = {}
        students.forEach((s) => { initial[s.id] = existing[s.id] ?? '' })
        setMarks(initial)
        setLoadingMarks(false)
      })

    return () => { cancelled = true }
  }, [ready, examId, subjectId, students, toast])

  function gradeFor(value) {
    const n = Number(value)
    if (value === '' || isNaN(n)) return null
    const pct = (n / maxMarks) * 100
    return scales.find((g) => pct >= Number(g.min_marks) && pct <= Number(g.max_marks)) || null
  }

  const stats = useMemo(() => {
    const values = Object.values(marks).map(Number).filter((n) => !isNaN(n) && n !== 0)
    if (values.length === 0) return null
    const sum = values.reduce((a, b) => a + b, 0)
    return {
      entered: values.length,
      average: (sum / values.length).toFixed(1),
      highest: Math.max(...values),
      lowest: Math.min(...values)
    }
  }, [marks])

  async function handleSave() {
    if (!ready) return
    setSaving(true)

    const rows = students
      .filter((s) => marks[s.id] !== '' && marks[s.id] !== undefined)
      .map((s) => {
        const g = gradeFor(marks[s.id])
        return {
          school_id: schoolId,
          exam_id: examId,
          student_id: s.id,
          subject_id: subjectId,
          class_id: classId,
          marks: Number(marks[s.id]),
          grade: g?.grade || null,
          remarks: g?.remarks || null,
          entered_by: profile?.id
        }
      })

    if (rows.length === 0) {
      setSaving(false)
      toast.error('Hakuna alama zilizojazwa.')
      return
    }

    const { error } = await supabase
      .from('results')
      .upsert(rows, { onConflict: 'exam_id,student_id,subject_id' })

    setSaving(false)
    if (error) toast.error(translateError(error))
    else toast.success(`Matokeo ya wanafunzi ${rows.length} yamehifadhiwa.`)
  }

  return (
    <>
      <PageHeader
        title="Matokeo"
        subtitle="Chagua mtihani, darasa na somo kisha ingiza alama."
        action={
          can('results.enter') && ready && students.length > 0 && (
            <Button icon={Save} onClick={handleSave} loading={saving}>Hifadhi</Button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select label="Mtihani" value={examId} onChange={(e) => setExamId(e.target.value)}
                placeholder="Chagua mtihani" options={exams.map((x) => ({ value: x.id, label: x.name }))} />
        <Select label="Darasa" value={classId} onChange={(e) => setClassId(e.target.value)}
                placeholder="Chagua darasa"
                options={classes.map((c) => ({ value: c.id, label: c.stream ? `${c.name} ${c.stream}` : c.name }))} />
        <Select label="Somo" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                placeholder="Chagua somo" options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
      </div>

      {!ready ? (
        <Card>
          <EmptyState icon={BarChart3} title="Chagua vigezo vyote vitatu"
                      description="Mtihani, darasa na somo vinahitajika ili kuingiza matokeo." />
        </Card>
      ) : isLoading || loadingMarks ? (
        <Spinner />
      ) : students.length === 0 ? (
        <Card><EmptyState title="Hakuna wanafunzi" description="Darasa hili halina wanafunzi wanaosoma." /></Card>
      ) : (
        <>
          {stats && (
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                ['Zimejazwa', `${stats.entered}/${students.length}`],
                ['Wastani', stats.average],
                ['Juu', stats.highest],
                ['Chini', stats.lowest]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                  <span className="text-slate-500">{label}: </span>
                  <span className="font-semibold text-slate-900 tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          )}

          <Card className="divide-y divide-slate-100">
            {students.map((s, i) => {
              const g = gradeFor(marks[s.id])
              return (
                <div key={s.id} className="flex items-center gap-3 p-4">
                  <span className="w-6 text-xs tabular-nums text-slate-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{fullName(s)}</p>
                    <p className="font-mono text-xs text-slate-400">{s.admission_no}</p>
                  </div>
                  {g && <Badge tone={g.grade === 'F' ? 'red' : 'blue'}>{g.grade}</Badge>}
                  <input
                    type="number"
                    min="0"
                    max={maxMarks}
                    step="0.5"
                    value={marks[s.id] ?? ''}
                    onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                    placeholder="—"
                    className="input w-24 text-center tabular-nums"
                  />
                  <span className="w-10 text-xs text-slate-400">/ {maxMarks}</span>
                </div>
              )
            })}
          </Card>
        </>
      )}
    </>
  )
}
