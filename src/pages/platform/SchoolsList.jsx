import { useState, useMemo } from 'react'
import { Plus, Pencil, Building2 } from 'lucide-react'
import { useTable, useInsert, useUpdate } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchInput from '@/components/shared/SearchInput'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/utils/format'
import { required, runValidation } from '@/utils/validate'

const EMPTY = {
  name: '', slug: '', region: '', district: '', phone: '', email: '',
  level: 'secondary', subscription_plan: 'basic'
}

export default function SchoolsList() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const { data: schools = [], isLoading } = useTable('schools', {
    scopeToSchool: false,
    order: { column: 'created_at', ascending: false }
  })

  const insert = useInsert('schools', { scopeToSchool: false })
  const update = useUpdate('schools')

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return schools
    return schools.filter((s) => s.name?.toLowerCase().includes(q) || s.region?.toLowerCase().includes(q))
  }, [schools, search])

  function openNew() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true) }
  function openEdit(s) {
    setEditing(s)
    setForm({
      name: s.name, slug: s.slug, region: s.region || '', district: s.district || '',
      phone: s.phone || '', email: s.email || '', level: s.level,
      subscription_plan: s.subscription_plan
    })
    setErrors({}); setOpen(true)
  }

  function slugify(text) {
    return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSave() {
    const { errors: errs, isValid } = runValidation({
      name: [() => required(form.name, 'Jina la shule')]
    })
    setErrors(errs)
    if (!isValid) return

    const payload = {
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      region: form.region?.trim() || null,
      district: form.district?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      level: form.level,
      subscription_plan: form.subscription_plan
    }

    try {
      if (editing) { await update.mutateAsync({ id: editing.id, ...payload }); toast.success('Shule imehifadhiwa.') }
      else { await insert.mutateAsync(payload); toast.success('Shule imesajiliwa.') }
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  async function toggleActive(s) {
    try {
      await update.mutateAsync({ id: s.id, is_active: !s.is_active })
      toast.success(s.is_active ? 'Shule imesimamishwa.' : 'Shule imerejeshwa.')
    } catch (e) { toast.error(e.message) }
  }

  const saving = insert.isPending || update.isPending

  return (
    <>
      <PageHeader
        title="Shule"
        subtitle={`${schools.length} shule`}
        action={<Button icon={Plus} onClick={openNew}>Sajili shule</Button>}
      />

      <div className="mb-4 sm:w-80">
        <SearchInput value={search} onChange={setSearch} placeholder="Tafuta shule..." />
      </div>

      <Card>
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="Hakuna shule"
                      action={<Button icon={Plus} onClick={openNew}>Sajili shule</Button>} />
        ) : (
          <Table>
            <THead columns={[
              { label: 'Shule' }, { label: 'Eneo' }, { label: 'Ngazi' },
              { label: 'Kifurushi' }, { label: 'Hali' }, { label: 'Tarehe' },
              { label: '', width: 60, align: 'right' }
            ]} />
            <TBody>
              {filtered.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <p className="font-medium text-slate-900">{s.name}</p>
                    <p className="font-mono text-xs text-slate-400">{s.slug}</p>
                  </TD>
                  <TD className="text-xs">{[s.district, s.region].filter(Boolean).join(', ') || '—'}</TD>
                  <TD className="text-xs">{s.level}</TD>
                  <TD className="text-xs uppercase">{s.subscription_plan}</TD>
                  <TD>
                    <button onClick={() => toggleActive(s)}>
                      <Badge tone={s.is_active ? 'green' : 'red'}>{s.is_active ? 'Hai' : 'Imesimamishwa'}</Badge>
                    </button>
                  </TD>
                  <TD className="text-xs">{formatDate(s.created_at)}</TD>
                  <TD align="right">
                    <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={open} onClose={() => setOpen(false)} size="lg"
        title={editing ? 'Hariri shule' : 'Sajili shule'}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Ghairi</Button>
          <Button onClick={handleSave} loading={saving}>Hifadhi</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Jina la shule" className="sm:col-span-2" value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Kitambulisho (slug)" placeholder="huachwa wazi kutengenezwa" value={form.slug} onChange={set('slug')} />
          <Select label="Ngazi" value={form.level} onChange={set('level')}
                  options={[
                    { value: 'primary', label: 'Msingi' },
                    { value: 'secondary', label: 'Sekondari' },
                    { value: 'both', label: 'Zote mbili' }
                  ]} />
          <Input label="Mkoa" value={form.region} onChange={set('region')} />
          <Input label="Wilaya" value={form.district} onChange={set('district')} />
          <Input label="Simu" value={form.phone} onChange={set('phone')} />
          <Input label="Barua pepe" type="email" value={form.email} onChange={set('email')} />
          <Select label="Kifurushi" className="sm:col-span-2" value={form.subscription_plan} onChange={set('subscription_plan')}
                  options={[
                    { value: 'basic', label: 'Basic' },
                    { value: 'premium', label: 'Premium' },
                    { value: 'enterprise', label: 'Enterprise' }
                  ]} />
        </div>
      </Modal>
    </>
  )
}
