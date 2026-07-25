import { useState } from 'react'
import { Plus, Trash2, Megaphone } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/utils/format'
import { required, runValidation } from '@/utils/validate'

const AUDIENCES = [
  { value: 'all',      label: 'Wote' },
  { value: 'teachers', label: 'Walimu' },
  { value: 'parents',  label: 'Wazazi' },
  { value: 'students', label: 'Wanafunzi' }
]

const EMPTY = { title: '', body: '', audience: 'all' }

export default function Announcements() {
  const { can, profile } = useAuth()
  const toast = useToast()

  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const { data: items = [], isLoading } = useTable('announcements', {
    order: { column: 'created_at', ascending: false }
  })

  const insert = useInsert('announcements')
  const remove = useDelete('announcements')

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  async function handleSave() {
    const { errors: errs, isValid } = runValidation({
      title: [() => required(form.title, 'Kichwa')],
      body:  [() => required(form.body, 'Maelezo')]
    })
    setErrors(errs)
    if (!isValid) return

    try {
      await insert.mutateAsync({
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        created_by: profile?.id
      })
      toast.success('Tangazo limechapishwa.')
      setForm(EMPTY)
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Tangazo limefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <PageHeader
        title="Matangazo"
        subtitle={`${items.length} matangazo`}
        action={can('announcements.create') && <Button icon={Plus} onClick={() => { setForm(EMPTY); setErrors({}); setOpen(true) }}>Andika tangazo</Button>}
      />

      {isLoading ? <Spinner /> : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="Hakuna matangazo"
            description="Matangazo yanawafikia wazazi, walimu na wanafunzi."
            action={can('announcements.create') && <Button icon={Plus} onClick={() => setOpen(true)}>Andika tangazo</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{a.title}</h3>
                    <Badge tone="blue">{AUDIENCES.find((x) => x.value === a.audience)?.label}</Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDate(a.created_at)}</p>
                </div>
                {can('announcements.create') && (
                  <button onClick={() => setDeleting(a)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)} title="Andika tangazo"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>Ghairi</Button>
          <Button onClick={handleSave} loading={insert.isPending}>Chapisha</Button>
        </>}
      >
        <div className="space-y-4">
          <Input label="Kichwa" value={form.title} onChange={set('title')} error={errors.title} />
          <div>
            <label className="label">Maelezo</label>
            <textarea rows={5} className="input resize-none" value={form.body} onChange={set('body')} />
            {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body}</p>}
          </div>
          <Select label="Walengwa" value={form.audience} onChange={set('audience')} options={AUDIENCES} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa tangazo"
        message="Tangazo hili litaondolewa kabisa." confirmLabel="Futa"
      />
    </>
  )
}
