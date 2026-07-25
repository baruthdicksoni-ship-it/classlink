import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useInsert, useUpdate, useTable } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { required, validPhone, normalizePhone, runValidation } from '@/utils/validate'

const EMPTY = {
  admission_no: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  class_id: '',
  admission_date: new Date().toISOString().slice(0, 10),
  status: 'active',
  address: '',
  guardian_name: '',
  guardian_phone: '',
  guardian_relation: 'Mzazi'
}

export default function StudentForm({ open, onClose, student }) {
  const { schoolId } = useAuth()
  const toast = useToast()
  const isEdit = Boolean(student?.id)

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const { data: classes = [] } = useTable('classes', { order: { column: 'name', ascending: true } })
  const insert = useInsert('students')
  const update = useUpdate('students')

  useEffect(() => {
    if (!open) return
    if (student) {
      setForm({ ...EMPTY, ...student, date_of_birth: student.date_of_birth || '' })
    } else {
      setForm(EMPTY)
      // Pendekeza namba ya usajili
      supabase.rpc('next_admission_no', { p_school_id: schoolId }).then(({ data }) => {
        if (data) setForm((f) => ({ ...f, admission_no: data }))
      })
    }
    setErrors({})
  }, [open, student, schoolId])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit() {
    const { errors: errs, isValid } = runValidation({
      admission_no: [() => required(form.admission_no, 'Namba ya usajili')],
      first_name:   [() => required(form.first_name, 'Jina la kwanza')],
      last_name:    [() => required(form.last_name, 'Jina la mwisho')],
      gender:       [() => required(form.gender, 'Jinsia')],
      guardian_phone: [() => validPhone(form.guardian_phone)]
    })

    setErrors(errs)
    if (!isValid) return

    const payload = {
      admission_no: form.admission_no.trim(),
      first_name: form.first_name.trim(),
      middle_name: form.middle_name?.trim() || null,
      last_name: form.last_name.trim(),
      gender: form.gender,
      date_of_birth: form.date_of_birth || null,
      class_id: form.class_id || null,
      admission_date: form.admission_date,
      status: form.status,
      address: form.address?.trim() || null,
      guardian_name: form.guardian_name?.trim() || null,
      guardian_phone: normalizePhone(form.guardian_phone),
      guardian_relation: form.guardian_relation?.trim() || null
    }

    try {
      if (isEdit) {
        await update.mutateAsync({ id: student.id, ...payload })
        toast.success('Taarifa za mwanafunzi zimehifadhiwa.')
      } else {
        await insert.mutateAsync(payload)
        toast.success('Mwanafunzi amesajiliwa.')
      }
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const saving = insert.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Hariri mwanafunzi' : 'Sajili mwanafunzi'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Ghairi</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Hifadhi' : 'Sajili'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Taarifa binafsi</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Namba ya usajili"
              value={form.admission_no}
              onChange={set('admission_no')}
              error={errors.admission_no}
            />
            <Select
              label="Jinsia"
              value={form.gender}
              onChange={set('gender')}
              placeholder="Chagua"
              error={errors.gender}
              options={[{ value: 'male', label: 'Mume' }, { value: 'female', label: 'Mke' }]}
            />
            <Input label="Jina la kwanza" value={form.first_name} onChange={set('first_name')} error={errors.first_name} />
            <Input label="Jina la kati" value={form.middle_name} onChange={set('middle_name')} />
            <Input label="Jina la mwisho" value={form.last_name} onChange={set('last_name')} error={errors.last_name} />
            <Input label="Tarehe ya kuzaliwa" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Taaluma</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Darasa"
              value={form.class_id}
              onChange={set('class_id')}
              placeholder="Chagua darasa"
              options={classes.map((c) => ({
                value: c.id,
                label: c.stream ? `${c.name} ${c.stream}` : c.name
              }))}
            />
            <Input label="Tarehe ya kujiunga" type="date" value={form.admission_date} onChange={set('admission_date')} />
            <Select
              label="Hali"
              value={form.status}
              onChange={set('status')}
              options={[
                { value: 'active', label: 'Anasoma' },
                { value: 'graduated', label: 'Amehitimu' },
                { value: 'transferred', label: 'Amehama' },
                { value: 'dropped', label: 'Ameacha' },
                { value: 'suspended', label: 'Amesimamishwa' }
              ]}
            />
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Mlezi</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Jina la mlezi" value={form.guardian_name} onChange={set('guardian_name')} />
            <Input
              label="Simu ya mlezi"
              placeholder="0712345678"
              value={form.guardian_phone}
              onChange={set('guardian_phone')}
              error={errors.guardian_phone}
            />
            <Input label="Uhusiano" value={form.guardian_relation} onChange={set('guardian_relation')} />
            <Input label="Anwani" value={form.address} onChange={set('address')} />
          </div>
        </section>
      </div>
    </Modal>
  )
}
