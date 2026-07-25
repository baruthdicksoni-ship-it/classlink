import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, School } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useUpdate, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { required, runValidation } from '@/utils/validate'

const EMPTY = { name: '', stream: '', level: '', class_teacher_id: '', capacity: 60 }

export default function Classes() {
  const { can } = useAuth()
  const toast = useToast()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const { data: classes = [], isLoading } = useTable('classes', {
    order: { column: 'name', ascending: true }
  })
  const { data: teachers = [] } = useTable('profiles', {
    select: 'id, full_name',
    filters: { role: 'teacher' },
    order: { column: 'full_name', ascending: true }
  })
  const { data: students = [] } = useTable('students', {
    select: 'id, class_id',
    filters: { status: 'active' }
  })

  const insert = useInsert('classes')
  const update = useUpdate('classes')
  const remove = useDelete('classes')

  const teacherMap = useMemo(
    () => Object.fromEntries(teachers.map((t) => [t.id, t.full_name])),
    [teachers]
  )
  const countMap = useMemo(() => {
    const m = {}
    students.forEach((s) => { if (s.class_id) m[s.class_id] = (m[s.class_id] || 0) + 1 })
    return m
  }, [students])

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  function openNew() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true) }
  function openEdit(c) {
    setEditing(c)
    setForm({
      name: c.name || '',
      stream: c.stream || '',
      level: c.level ?? '',
      class_teacher_id: c.class_teacher_id || '',
      capacity: c.capacity ?? 60
    })
    setErrors({})
    setOpen(true)
  }

  async function handleSave() {
    const { errors: errs, isValid } = runValidation({
      name: [() => required(form.name, 'Jina la darasa')]
    })
    setErrors(errs)
    if (!isValid) return

    const payload = {
      name: form.name.trim(),
      stream: form.stream?.trim() || null,
      level: form.level ? Number(form.level) : null,
      class_teacher_id: form.class_teacher_id || null,
      capacity: Number(form.capacity) || 60
    }

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload })
        toast.success('Darasa limehifadhiwa.')
      } else {
        await insert.mutateAsync(payload)
        toast.success('Darasa limeongezwa.')
      }
      setOpen(false)
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Darasa limefutwa.')
      setDeleting(null)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const saving = insert.isPending || update.isPending

  return (
    <>
      <PageHeader
        title="Madarasa"
        subtitle={`${classes.length} madarasa`}
        action={can('classes.manage') && <Button icon={Plus} onClick={openNew}>Ongeza darasa</Button>}
      />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : classes.length === 0 ? (
          <EmptyState
            icon={School}
            title="Hakuna madarasa"
            description="Ongeza darasa la kwanza ili uweze kusajili wanafunzi."
            action={can('classes.manage') && <Button icon={Plus} onClick={openNew}>Ongeza darasa</Button>}
          />
        ) : (
          <Table>
            <THead columns={[
              { label: 'Darasa' },
              { label: 'Ngazi' },
              { label: 'Mwalimu wa darasa' },
              { label: 'Wanafunzi', align: 'right' },
              { label: 'Nafasi', align: 'right' },
              { label: '', width: 90, align: 'right' }
            ]} />
            <TBody>
              {classes.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium text-slate-900">
                    {c.stream ? `${c.name} ${c.stream}` : c.name}
                  </TD>
                  <TD>{c.level ?? '—'}</TD>
                  <TD>{teacherMap[c.class_teacher_id] || '—'}</TD>
                  <TD align="right" className="tabular-nums">{countMap[c.id] || 0}</TD>
                  <TD align="right" className="tabular-nums text-slate-400">{c.capacity}</TD>
                  <TD align="right">
                    {can('classes.manage') && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Hariri darasa' : 'Ongeza darasa'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Ghairi</Button>
            <Button onClick={handleSave} loading={saving}>Hifadhi</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Jina la darasa" placeholder="Form 1" value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Mkondo" placeholder="A" value={form.stream} onChange={set('stream')} />
          <Input label="Ngazi" type="number" min="1" max="6" value={form.level} onChange={set('level')} />
          <Input label="Nafasi" type="number" min="1" value={form.capacity} onChange={set('capacity')} />
          <Select
            label="Mwalimu wa darasa"
            className="sm:col-span-2"
            value={form.class_teacher_id}
            onChange={set('class_teacher_id')}
            placeholder="Hakuna"
            options={teachers.map((t) => ({ value: t.id, label: t.full_name }))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title="Futa darasa"
        message="Wanafunzi wa darasa hili watabaki bila darasa. Endelea?"
        confirmLabel="Futa"
      />
    </>
  )
}
