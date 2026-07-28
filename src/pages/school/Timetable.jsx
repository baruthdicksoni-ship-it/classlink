import { useState, useMemo } from 'react'
import { Plus, CalendarClock, Trash2, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { required, runValidation } from '@/utils/validate'

const DAYS = [
  { value: 1, label: 'Jumatatu', short: 'Jtatu' },
  { value: 2, label: 'Jumanne', short: 'Jnne' },
  { value: 3, label: 'Jumatano', short: 'Jtano' },
  { value: 4, label: 'Alhamisi', short: 'Alh' },
  { value: 5, label: 'Ijumaa', short: 'Ijm' }
]

const SLOT_TYPES = [
  { value: 'lesson',   label: 'Somo' },
  { value: 'break',    label: 'Mapumziko' },
  { value: 'assembly', label: 'Mkutano' },
  { value: 'other',    label: 'Nyingine' }
]

const EMPTY = {
  day_of_week: 1, start_time: '08:00', end_time: '08:40',
  slot_type: 'lesson', subject_id: '', teacher_id: '', room: '', label: ''
}

const fmtTime = (t) => (t ? t.slice(0, 5) : '')

export default function Timetable() {
  const { can } = useAuth()
  const toast = useToast()

  const [classId, setClassId] = useState('')
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const { data: classes = [] } = useTable('classes', { order: { column: 'name', ascending: true } })
  const { data: subjects = [] } = useTable('subjects', { order: { column: 'name', ascending: true } })
  const { data: teachers = [] } = useTable('profiles', {
    select: 'id, full_name',
    filters: { role: 'teacher' },
    order: { column: 'full_name', ascending: true }
  })
  const { data: slots = [], isLoading } = useTable('timetable_slots', {
    filters: { class_id: classId },
    order: { column: 'start_time', ascending: true },
    enabled: Boolean(classId)
  })

  const insert = useInsert('timetable_slots')
  const remove = useDelete('timetable_slots')

  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects])
  const teacherMap = useMemo(() => Object.fromEntries(teachers.map((t) => [t.id, t.full_name])), [teachers])
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  // Panga slots kwa siku
  const byDay = useMemo(() => {
    const map = {}
    DAYS.forEach((d) => { map[d.value] = [] })
    slots.forEach((s) => { if (map[s.day_of_week]) map[s.day_of_week].push(s) })
    return map
  }, [slots])

  function openNew() { setForm(EMPTY); setErrors({}); setOpen(true) }

  async function handleSave() {
    const rules = {
      start_time: [() => required(form.start_time, 'Muda wa kuanza')],
      end_time:   [() => required(form.end_time, 'Muda wa kumaliza')]
    }
    if (form.slot_type === 'lesson') {
      rules.subject_id = [() => required(form.subject_id, 'Somo')]
    }
    const { errors: errs, isValid } = runValidation(rules)
    setErrors(errs)
    if (!isValid) return
    if (form.end_time <= form.start_time) {
      setErrors({ end_time: 'Muda wa kumaliza lazima uwe baada ya kuanza' })
      return
    }

    try {
      await insert.mutateAsync({
        class_id: classId,
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        slot_type: form.slot_type,
        subject_id: form.slot_type === 'lesson' ? form.subject_id : null,
        teacher_id: form.slot_type === 'lesson' ? (form.teacher_id || null) : null,
        room: form.room || null,
        label: form.slot_type !== 'lesson' ? (form.label || null) : null
      })
      toast.success('Kipindi kimeongezwa.')
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Kipindi kimefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <PageHeader
        title="Ratiba"
        subtitle="Ratiba ya masomo kwa darasa"
        action={classId && can('timetable.manage') && <Button icon={Plus} onClick={openNew}>Ongeza kipindi</Button>}
      />

      <div className="mb-4 sm:w-80">
        <Select value={classId} onChange={(e) => setClassId(e.target.value)}
                placeholder="Chagua darasa"
                options={classes.map((c) => ({ value: c.id, label: c.stream ? `${c.name} ${c.stream}` : c.name }))} />
      </div>

      {!classId ? (
        <Card>
          <EmptyState icon={CalendarClock} title="Chagua darasa"
                      description="Chagua darasa hapo juu kuona au kupanga ratiba yake." />
        </Card>
      ) : isLoading ? (
        <Spinner />
      ) : slots.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarClock} title="Hakuna ratiba bado"
                      description="Ongeza vipindi kupanga ratiba ya darasa hili."
                      action={can('timetable.manage') && <Button icon={Plus} onClick={openNew}>Ongeza kipindi</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {DAYS.map((day) => (
            <div key={day.value} className="card overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">{day.label}</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {byDay[day.value].length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-400">Hakuna vipindi</p>
                ) : (
                  byDay[day.value].map((slot) => (
                    <div key={slot.id} className="group px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)}
                        </div>
                        {can('timetable.manage') && (
                          <button onClick={() => setDeleting(slot)}
                                  className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {slot.slot_type === 'lesson' ? (
                        <>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {subjectMap[slot.subject_id] || 'Somo'}
                          </p>
                          {slot.teacher_id && (
                            <p className="text-xs text-slate-500">{teacherMap[slot.teacher_id]}</p>
                          )}
                          {slot.room && <p className="text-xs text-slate-400">{slot.room}</p>}
                        </>
                      ) : (
                        <p className="mt-1 text-sm font-medium text-brand-600">
                          {slot.label || SLOT_TYPES.find((t) => t.value === slot.slot_type)?.label}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ongeza kipindi */}
      <Modal
        open={open} onClose={() => setOpen(false)} title="Ongeza kipindi"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={insert.isPending}>Ghairi</Button>
          <Button onClick={handleSave} loading={insert.isPending}>Hifadhi</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Siku" value={form.day_of_week} onChange={set('day_of_week')}
                  options={DAYS.map((d) => ({ value: d.value, label: d.label }))} />
          <Select label="Aina" value={form.slot_type} onChange={set('slot_type')} options={SLOT_TYPES} />
          <Input label="Kuanza" type="time" value={form.start_time} onChange={set('start_time')} error={errors.start_time} />
          <Input label="Kumaliza" type="time" value={form.end_time} onChange={set('end_time')} error={errors.end_time} />

          {form.slot_type === 'lesson' ? (
            <>
              <Select label="Somo" value={form.subject_id} onChange={set('subject_id')}
                      placeholder="Chagua somo" error={errors.subject_id}
                      options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
              <Select label="Mwalimu (hiari)" value={form.teacher_id} onChange={set('teacher_id')}
                      placeholder="Chagua mwalimu"
                      options={teachers.map((t) => ({ value: t.id, label: t.full_name }))} />
              <Input label="Chumba (hiari)" className="sm:col-span-2" placeholder="Chumba 1"
                     value={form.room} onChange={set('room')} />
            </>
          ) : (
            <Input label="Jina (mfano: Mapumziko)" className="sm:col-span-2"
                   value={form.label} onChange={set('label')} />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa kipindi"
        message="Kipindi hiki kitaondolewa kwenye ratiba. Endelea?" confirmLabel="Futa"
      />
    </>
  )
}
