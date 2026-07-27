import { useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useUpdate, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { required, runValidation } from '@/utils/validate'

const EMPTY = { name: '', code: '', is_core: 'true' }

export default function Subjects() {
  const { can } = useAuth()
  const toast = useToast()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const { data: subjects = [], isLoading } = useTable('subjects', {
    order: { column: 'name', ascending: true }
  })

  const insert = useInsert('subjects')
  const update = useUpdate('subjects')
  const remove = useDelete('subjects')

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  function openNew() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true) }
  function openEdit(s) {
    setEditing(s)
    setForm({ name: s.name, code: s.code, is_core: String(s.is_core) })
    setErrors({})
    setOpen(true)
  }

  async function handleSave() {
    const { errors: errs, isValid } = runValidation({
      name: [() => required(form.name, 'Jina la somo')],
      code: [() => required(form.code, 'Msimbo')]
    })
    setErrors(errs)
    if (!isValid) return

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      is_core: form.is_core === 'true'
    }

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload })
        toast.success('Somo limehifadhiwa.')
      } else {
        await insert.mutateAsync(payload)
        toast.success('Somo limeongezwa.')
      }
      setOpen(false)
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Somo limefutwa.')
      setDeleting(null)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const saving = insert.isPending || update.isPending

  return (
    <>
      <PageHeader
        title="Masomo"
        subtitle={`${subjects.length} masomo`}
        action={can('subjects.manage') && <Button icon={Plus} onClick={openNew}>Ongeza somo</Button>}
      />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Hakuna masomo"
            description="Ongeza masomo yanayofundishwa shuleni kwako."
            action={can('subjects.manage') && <Button icon={Plus} onClick={openNew}>Ongeza somo</Button>}
          />
        ) : (
          <Table>
            <THead columns={[
              { label: 'Msimbo', width: 120 },
              { label: 'Somo' },
              { label: 'Aina' },
              { label: '', width: 90, align: 'right' }
            ]} />
            <TBody>
              {subjects.map((s) => (
                <TR key={s.id}>
                  <TD className="font-mono text-xs">{s.code}</TD>
                  <TD className="font-medium text-slate-900">{s.name}</TD>
                  <TD>
                    <Badge tone={s.is_core ? 'blue' : 'slate'}>
                      {s.is_core ? 'La lazima' : 'La hiari'}
                    </Badge>
                  </TD>
                  <TD align="right">
                    {can('subjects.manage') && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(s)} className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
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
        title={editing ? 'Hariri somo' : 'Ongeza somo'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Ghairi</Button>
            <Button onClick={handleSave} loading={saving}>Hifadhi</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Jina la somo" placeholder="Hisabati" value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Msimbo" placeholder="MATH" value={form.code} onChange={set('code')} error={errors.code} />
          <Select
            label="Aina"
            value={form.is_core}
            onChange={set('is_core')}
            options={[
              { value: 'true', label: 'La lazima' },
              { value: 'false', label: 'La hiari' }
            ]}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title="Futa somo"
        message="Matokeo yanayohusiana na somo hili yatafutwa pia. Endelea?"
        confirmLabel="Futa"
      />
    </>
  )
}
