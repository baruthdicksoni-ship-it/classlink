import { useState, useMemo } from 'react'
import { Plus, Users, Pencil, Briefcase, Phone } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useUpdate } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import CreateUserModal from '@/components/shared/CreateUserModal'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatMoney, formatDate } from '@/utils/format'

const EMP_TYPES = [
  { value: 'full_time', label: 'Muda kamili' },
  { value: 'part_time', label: 'Muda sehemu' },
  { value: 'contract',  label: 'Mkataba' },
  { value: 'volunteer', label: 'Kujitolea' }
]
const EMP_LABEL = Object.fromEntries(EMP_TYPES.map((t) => [t.value, t.label]))

const EMPTY = {
  profile_id: '', job_title: '', department: '', employment_type: 'full_time',
  hire_date: '', salary: '', phone: '', national_id: '', emergency_contact: '', notes: ''
}

export default function Staff() {
  const { can, schoolId } = useAuth()
  const toast = useToast()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  // Wafanyakazi: walimu + staff (wenye akaunti, si wanafunzi/wazazi)
  const { data: profiles = [] } = useTable('profiles', {
    select: 'id, full_name, email, role',
    order: { column: 'full_name', ascending: true }
  })
  const { data: records = [], isLoading } = useTable('staff_records', {
    order: { column: 'created_at', ascending: false }
  })

  const insert = useInsert('staff_records')
  const update = useUpdate('staff_records')
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  // Wafanyakazi (walimu + staff)
  const staffProfiles = useMemo(
    () => profiles.filter((p) => ['teacher', 'staff', 'school_admin', 'school_owner'].includes(p.role)),
    [profiles]
  )
  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles])

  // Profiles wasio na rekodi bado (kwa dropdown ya kuongeza)
  const withoutRecord = useMemo(() => {
    const has = new Set(records.map((r) => r.profile_id))
    return staffProfiles.filter((p) => !has.has(p.id))
  }, [staffProfiles, records])

  function openNew() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true) }
  function openEdit(r) {
    setEditing(r)
    setForm({
      profile_id: r.profile_id, job_title: r.job_title || '', department: r.department || '',
      employment_type: r.employment_type || 'full_time', hire_date: r.hire_date || '',
      salary: r.salary ?? '', phone: r.phone || '', national_id: r.national_id || '',
      emergency_contact: r.emergency_contact || '', notes: r.notes || ''
    })
    setErrors({}); setOpen(true)
  }

  async function handleSave() {
    if (!form.profile_id) { setErrors({ profile_id: 'Chagua mfanyakazi' }); return }
    const payload = {
      profile_id: form.profile_id,
      job_title: form.job_title.trim() || null,
      department: form.department.trim() || null,
      employment_type: form.employment_type,
      hire_date: form.hire_date || null,
      salary: form.salary === '' ? null : Number(form.salary),
      phone: form.phone.trim() || null,
      national_id: form.national_id.trim() || null,
      emergency_contact: form.emergency_contact.trim() || null,
      notes: form.notes.trim() || null
    }
    try {
      if (editing) { await update.mutateAsync({ id: editing.id, ...payload }); toast.success('Rekodi imehifadhiwa.') }
      else { await insert.mutateAsync(payload); toast.success('Mfanyakazi ameongezwa.') }
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  const saving = insert.isPending || update.isPending

  return (
    <>
      <PageHeader
        title="Wafanyakazi"
        subtitle={`${records.length} wenye rekodi za HR`}
        action={can('hr.manage') && (
          <div className="flex gap-2">
            <Button variant="secondary" icon={Plus} onClick={() => setCreateOpen(true)}>Akaunti mpya</Button>
            <Button icon={Plus} onClick={openNew}>Rekodi ya HR</Button>
          </div>
        )}
      />

      <Card>
        {isLoading ? <Spinner /> : records.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Hakuna rekodi za wafanyakazi"
            description="Ongeza rekodi ya HR kwa mfanyakazi. Kama hana akaunti bado, tengeneza akaunti kwanza."
            action={can('hr.manage') && <Button icon={Plus} onClick={openNew}>Rekodi ya HR</Button>}
          />
        ) : (
          <Table minWidth="720px">
            <THead columns={[
              { label: 'Jina' }, { label: 'Kazi' }, { label: 'Idara', hideOnMobile: true },
              { label: 'Aina', hideOnMobile: true },
              ...(can('hr.manage') ? [{ label: 'Mshahara', align: 'right', hideOnMobile: true }] : []),
              { label: '', width: 60, align: 'right' }
            ]} />
            <TBody>
              {records.map((r) => {
                const p = profileMap[r.profile_id]
                return (
                  <TR key={r.id}>
                    <TD className="font-medium text-slate-900">{p?.full_name || '—'}</TD>
                    <TD>{r.job_title || '—'}</TD>
                    <TD hideOnMobile>{r.department || '—'}</TD>
                    <TD hideOnMobile><Badge tone="slate">{EMP_LABEL[r.employment_type]}</Badge></TD>
                    {can('hr.manage') && (
                      <TD align="right" className="tabular-nums" hideOnMobile>
                        {r.salary != null ? formatMoney(r.salary) : '—'}
                      </TD>
                    )}
                    <TD align="right">
                      {can('hr.manage') && (
                        <button onClick={() => openEdit(r)} className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Rekodi ya HR */}
      <Modal
        open={open} onClose={() => setOpen(false)}
        title={editing ? 'Hariri rekodi ya HR' : 'Rekodi mpya ya HR'}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Ghairi</Button>
          <Button onClick={handleSave} loading={saving}>Hifadhi</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {editing ? (
            <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">{profileMap[form.profile_id]?.full_name}</p>
              <p className="text-xs text-slate-500">{profileMap[form.profile_id]?.email}</p>
            </div>
          ) : (
            <Select label="Mfanyakazi" className="sm:col-span-2" value={form.profile_id} onChange={set('profile_id')}
                    placeholder="Chagua mfanyakazi" error={errors.profile_id}
                    options={withoutRecord.map((p) => ({ value: p.id, label: p.full_name }))} />
          )}
          <Input label="Cheo/Kazi" placeholder="Mfano: Mlinzi, Mpishi" value={form.job_title} onChange={set('job_title')} />
          <Input label="Idara" placeholder="Mfano: Usalama" value={form.department} onChange={set('department')} />
          <Select label="Aina ya ajira" value={form.employment_type} onChange={set('employment_type')} options={EMP_TYPES} />
          <Input label="Tarehe ya kuajiriwa" type="date" value={form.hire_date} onChange={set('hire_date')} />
          <Input label="Mshahara (TZS)" type="number" min="0" placeholder="0" value={form.salary} onChange={set('salary')} />
          <Input label="Simu" value={form.phone} onChange={set('phone')} />
          <Input label="Namba ya kitambulisho" value={form.national_id} onChange={set('national_id')} />
          <Input label="Mawasiliano ya dharura" value={form.emergency_contact} onChange={set('emergency_contact')} />
          <div className="sm:col-span-2">
            <label className="label">Maelezo (hiari)</label>
            <textarea className="input min-h-[70px] resize-y" value={form.notes} onChange={set('notes')} />
          </div>
        </div>
      </Modal>

      {/* Tengeneza akaunti ya mfanyakazi */}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        allowedRoles={['staff', 'teacher']}
        title="Tengeneza akaunti ya mfanyakazi"
      />
    </>
  )
}
