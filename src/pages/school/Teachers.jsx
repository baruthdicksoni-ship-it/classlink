import { useState, useMemo } from 'react'
import { Users, Pencil, Trash2, Mail, Phone, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useUpdate, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchInput from '@/components/shared/SearchInput'
import CreateUserModal from '@/components/shared/CreateUserModal'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { validPhone, normalizePhone, required, runValidation } from '@/utils/validate'

export default function Teachers() {
  const { can } = useAuth()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [errors, setErrors] = useState({})

  const { data: teachers = [], isLoading } = useTable('profiles', {
    select: 'id, full_name, email, phone, gender, is_active, created_at',
    filters: { role: 'teacher' },
    order: { column: 'full_name', ascending: true }
  })

  const update = useUpdate('profiles')
  const remove = useDelete('profiles')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teachers
    return teachers.filter((t) =>
      t.full_name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q)
    )
  }, [teachers, search])

  function openEdit(t) {
    setEditing(t)
    setForm({ full_name: t.full_name || '', phone: t.phone || '' })
    setErrors({})
  }

  async function handleSave() {
    const { errors: errs, isValid } = runValidation({
      full_name: [() => required(form.full_name, 'Jina')],
      phone: [() => validPhone(form.phone)]
    })
    setErrors(errs)
    if (!isValid) return

    try {
      await update.mutateAsync({
        id: editing.id,
        full_name: form.full_name.trim(),
        phone: normalizePhone(form.phone)
      })
      toast.success('Taarifa zimehifadhiwa.')
      setEditing(null)
    } catch (e) { toast.error(e.message) }
  }

  async function toggleActive(t) {
    try {
      await update.mutateAsync({ id: t.id, is_active: !t.is_active })
      toast.success(t.is_active ? 'Mwalimu amesimamishwa.' : 'Mwalimu amerejeshwa.')
    } catch (e) { toast.error(e.message) }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Mwalimu amefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <PageHeader
        title="Walimu"
        subtitle={`${teachers.length} walimu`}
        action={can('users.create') && (
          <Button icon={UserPlus} onClick={() => setCreateOpen(true)}>Tengeneza mwalimu</Button>
        )}
      />

      <div className="mb-4 sm:w-80">
        <SearchInput value={search} onChange={setSearch} placeholder="Tafuta mwalimu..." />
      </div>

      <Card>
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Hakuna walimu"
            description="Bofya “Tengeneza mwalimu” kumsajili mwalimu, kisha umkabidhi barua pepe na nenosiri la kuingia."
            action={can('users.create') && (
              <Button icon={UserPlus} onClick={() => setCreateOpen(true)}>Tengeneza mwalimu</Button>
            )}
          />
        ) : (
          <Table>
            <THead columns={[
              { label: 'Jina' }, { label: 'Mawasiliano' }, { label: 'Hali' },
              { label: '', width: 90, align: 'right' }
            ]} />
            <TBody>
              {filtered.map((t) => (
                <TR key={t.id}>
                  <TD className="font-medium text-slate-900">{t.full_name}</TD>
                  <TD>
                    <div className="space-y-0.5 text-xs text-slate-500">
                      {t.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{t.email}</p>}
                      {t.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{t.phone}</p>}
                    </div>
                  </TD>
                  <TD>
                    <button onClick={() => can('teachers.edit') && toggleActive(t)} disabled={!can('teachers.edit')}>
                      <Badge tone={t.is_active ? 'green' : 'slate'}>
                        {t.is_active ? 'Anafanya kazi' : 'Amesimamishwa'}
                      </Badge>
                    </button>
                  </TD>
                  <TD align="right">
                    {can('teachers.edit') && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(t)} className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {can('teachers.delete') && (
                          <button onClick={() => setDeleting(t)} className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
        open={Boolean(editing)} onClose={() => setEditing(null)} title="Hariri mwalimu"
        footer={<>
          <Button variant="secondary" onClick={() => setEditing(null)}>Ghairi</Button>
          <Button onClick={handleSave} loading={update.isPending}>Hifadhi</Button>
        </>}
      >
        <div className="space-y-4">
          <Input label="Jina kamili" value={form.full_name}
                 onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} error={errors.full_name} />
          <Input label="Simu" placeholder="0712345678" value={form.phone}
                 onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} error={errors.phone} />
          <p className="text-xs text-slate-500">Barua pepe haiwezi kubadilishwa hapa.</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa mwalimu"
        message="Mwalimu ataondolewa kwenye shule hii. Endelea?" confirmLabel="Futa"
      />

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        allowedRoles={['teacher']}
        title="Tengeneza mwalimu"
      />
    </>
  )
}
