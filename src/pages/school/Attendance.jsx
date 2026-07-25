import { useState, useMemo, useEffect } from 'react'
import { Save, ClipboardCheck } from 'lucide-react'
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
import { fullName, ATTENDANCE_STATUS } from '@/utils/format'
import { translateError } from '@/hooks/useSupabaseQuery'

const OPTIONS = [
  { value: 'present', label: 'Yupo',       cls: 'bg-emerald-600 text-white' },
  { value: 'absent',  label: 'Hayupo',     cls: 'bg-red-600 text-white' },
  { value: 'late',    label: 'Amechelewa', cls: 'bg-amber-500 text-white' },
  { value: 'excused', label: 'Ruhusa',     cls: 'bg-brand-600 text-white' }
]

export default function Attendance() {
  const { schoolId, profile, can } = useAuth()
  const toast = useToast()

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [classId, setClassId] = useState('')
  const [marks, setMarks] = useState({})
  const [loadingMarks, setLoadingMarks] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: classes = [] } = useTable('classes', { order: { column: 'name', ascending: true } })

  const { data: students = [], isLoading } = useTable('students', {
    select: 'id, admission_no, first_name, middle_name, last_name',
    filters: { class_id: classId, status: 'active' },
    order: { column: 'first_name', ascending: true },
    enabled: Boolean(classId)
  })

  // Pakia mahudhurio yaliyopo tayari
  useEffect(() => {
    if (!classId || !date || students.length === 0) { setMarks({}); return }

    let cancelled = false
    setLoadingMarks(true)

    supabase
      .from('attendance')
      .select('student_id, status')
      .eq('class_id', classId)
      .eq('date', date)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { toast.error(translateError(error)); setLoadingMarks(false); return }
        const existing = Object.fromEntries((data || []).map((r) => [r.student_id, r.status]))
        // Chaguo-msingi: wote wapo
        const initial = {}
        students.forEach((s) => { initial[s.id] = existing[s.id] || 'present' })
        setMarks(initial)
        setLoadingMarks(false)
      })

    return () => { cancelled = true }
  }, [classId, date, students, toast])

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 }
    Object.values(marks).forEach((v) => { if (counts[v] !== undefined) counts[v]++ })
    return counts
  }, [marks])

  function setAll(status) {
    const next = {}
    students.forEach((s) => { next[s.id] = status })
    setMarks(next)
  }

  async function handleSave() {
    if (!classId || students.length === 0) return
    setSaving(true)

    const rows = students.map((s) => ({
      school_id: schoolId,
      student_id: s.id,
      class_id: classId,
      date,
      status: marks[s.id] || 'present',
      recorded_by: profile?.id
    }))

    const { error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'student_id,date' })

    setSaving(false)
    if (error) toast.error(translateError(error))
    else toast.success('Mahudhurio yamehifadhiwa.')
  }

  return (
    <>
      <PageHeader
        title="Mahudhurio"
        subtitle="Chagua darasa na tarehe, kisha weka alama."
        action={
          can('attendance.record') && classId && students.length > 0 && (
            <Button icon={Save} onClick={handleSave} loading={saving}>Hifadhi</Button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-2/3">
        <Select
          label="Darasa"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Chagua darasa"
          options={classes.map((c) => ({
            value: c.id,
            label: c.stream ? `${c.name} ${c.stream}` : c.name
          }))}
        />
        <Input label="Tarehe" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
      </div>

      {!classId ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="Chagua darasa"
            description="Mahudhurio yataonekana baada ya kuchagua darasa."
          />
        </Card>
      ) : isLoading || loadingMarks ? (
        <Spinner />
      ) : students.length === 0 ? (
        <Card>
          <EmptyState title="Hakuna wanafunzi" description="Darasa hili halina wanafunzi wanaosoma." />
        </Card>
      ) : (
        <>
          {/* Muhtasari */}
          <div className="mb-4 flex flex-wrap gap-2">
            {OPTIONS.map((o) => (
              <div key={o.value} className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                <span className="text-slate-500">{o.label}: </span>
                <span className="font-semibold text-slate-900 tabular-nums">{summary[o.value]}</span>
              </div>
            ))}
            <div className="flex-1" />
            <Button size="sm" variant="secondary" onClick={() => setAll('present')}>Wote wapo</Button>
          </div>

          <Card className="divide-y divide-slate-100">
            {students.map((s, i) => (
              <div key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 text-xs tabular-nums text-slate-400">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{fullName(s)}</p>
                    <p className="font-mono text-xs text-slate-400">{s.admission_no}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {OPTIONS.map((o) => {
                    const active = marks[s.id] === o.value
                    return (
                      <button
                        key={o.value}
                        onClick={() => setMarks((m) => ({ ...m, [s.id]: o.value }))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          active ? o.cls : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </>
  )
}
