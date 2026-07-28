import { useState, useMemo } from 'react'
import { FileText, Download, Trash2, Upload, File, Users, Lock, Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import SearchInput from '@/components/shared/SearchInput'
import { fullName, formatDate } from '@/utils/format'

const CATEGORIES = [
  { value: 'policy',      label: 'Sera' },
  { value: 'form',        label: 'Fomu' },
  { value: 'notice',      label: 'Tangazo/Taarifa' },
  { value: 'certificate', label: 'Cheti' },
  { value: 'letter',      label: 'Barua' },
  { value: 'report',      label: 'Ripoti' },
  { value: 'financial',   label: 'Kifedha' },
  { value: 'other',       label: 'Nyingine' }
]
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))

const AUDIENCE = {
  staff:   { label: 'Wafanyakazi', icon: Lock,  tone: 'slate' },
  parents: { label: 'Wazazi',      icon: Users, tone: 'blue' },
  public:  { label: 'Wote',        icon: Globe, tone: 'green' }
}

const BUCKET = 'documents'
const fmtSize = (b) => {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

export default function Documents() {
  const { can, schoolId, userId } = useAuth()
  const toast = useToast()

  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({ title: '', category: 'other', audience: 'staff', student_id: '', description: '' })
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)

  const { data: docs = [], isLoading, refetch } = useTable('documents', {
    order: { column: 'created_at', ascending: false }
  })
  const { data: students = [] } = useTable('students', {
    select: 'id, admission_no, first_name, middle_name, last_name',
    filters: { status: 'active' },
    order: { column: 'first_name', ascending: true }
  })

  const insert = useInsert('documents')
  const remove = useDelete('documents')
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const studentMap = useMemo(() => Object.fromEntries(students.map((s) => [s.id, fullName(s)])), [students])

  const filtered = useMemo(() => {
    let list = docs
    if (catFilter) list = list.filter((d) => d.category === catFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((d) => d.title.toLowerCase().includes(q))
    }
    return list
  }, [docs, catFilter, search])

  function openNew() {
    setForm({ title: '', category: 'other', audience: 'staff', student_id: '', description: '' })
    setFile(null); setErrors({}); setOpen(true)
  }

  function onFilePick(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1048576) { toast.error('Faili ni kubwa mno (kikomo 10MB).'); return }
    setFile(f)
    if (!form.title) setForm((p) => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') }))
  }

  async function handleUpload() {
    if (!form.title.trim()) { setErrors({ title: 'Kichwa kinahitajika' }); return }
    if (!file) { setErrors({ file: 'Chagua faili' }); return }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${schoolId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600', upsert: false
      })
      if (upErr) throw upErr

      await insert.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        audience: form.audience,
        student_id: form.student_id || null,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: userId
      })
      toast.success('Nyaraka imepakiwa.')
      setOpen(false)
      refetch()
    } catch (e) {
      toast.error(e.message || 'Imeshindwa kupakia.')
    } finally {
      setUploading(false)
    }
  }

  async function download(doc) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60)
    if (error) { toast.error('Imeshindwa kupata faili.'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function confirmDelete() {
    try {
      await supabase.storage.from(BUCKET).remove([deleting.file_path])
      await remove.mutateAsync(deleting.id)
      toast.success('Nyaraka imefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <PageHeader
        title="Nyaraka"
        subtitle={`${docs.length} nyaraka`}
        action={can('documents.manage') && <Button icon={Upload} onClick={openNew}>Pakia nyaraka</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="sm:w-72"><SearchInput value={search} onChange={setSearch} placeholder="Tafuta nyaraka..." /></div>
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
                placeholder="Kategoria zote" className="sm:w-48" options={CATEGORIES} />
      </div>

      <Card>
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search || catFilter ? 'Hakuna nyaraka iliyopatikana' : 'Hakuna nyaraka bado'}
            description={search || catFilter ? 'Jaribu kigezo kingine.' : 'Pakia nyaraka rasmi za shule hapa.'}
            action={!search && !catFilter && can('documents.manage') && <Button icon={Upload} onClick={openNew}>Pakia nyaraka</Button>}
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((d) => {
              const aud = AUDIENCE[d.audience] || AUDIENCE.staff
              const AudIcon = aud.icon
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <File className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{d.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                      <span>{CAT_LABEL[d.category]}</span>
                      {d.file_size ? <><span>·</span><span>{fmtSize(d.file_size)}</span></> : null}
                      {d.student_id && <><span>·</span><span>{studentMap[d.student_id] || 'Mwanafunzi'}</span></>}
                      <span>·</span>
                      <span>{formatDate(d.created_at)}</span>
                    </div>
                  </div>
                  <Badge tone={aud.tone} className="hidden sm:inline-flex">
                    <AudIcon className="mr-1 inline h-3 w-3" />{aud.label}
                  </Badge>
                  <button onClick={() => download(d)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600" title="Pakua">
                    <Download className="h-4 w-4" />
                  </button>
                  {can('documents.manage') && (
                    <button onClick={() => setDeleting(d)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Futa">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Pakia nyaraka"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={uploading}>Ghairi</Button>
          <Button onClick={handleUpload} loading={uploading}>Pakia</Button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Faili</label>
            <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
              file ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input type="file" className="hidden" onChange={onFilePick}
                     accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
              {file ? (
                <>
                  <File className="mb-1 h-6 w-6 text-brand-600" />
                  <p className="text-sm font-medium text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-400">{fmtSize(file.size)}</p>
                </>
              ) : (
                <>
                  <Upload className="mb-1 h-6 w-6 text-slate-400" />
                  <p className="text-sm text-slate-500">Bofya kuchagua faili</p>
                  <p className="text-xs text-slate-400">PDF, Word, Excel, picha (kikomo 10MB)</p>
                </>
              )}
            </label>
            {errors.file && <p className="mt-1 text-xs text-red-600">{errors.file}</p>}
          </div>

          <Input label="Kichwa" placeholder="Mfano: Sera ya Nidhamu 2026"
                 value={form.title} onChange={set('title')} error={errors.title} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Kategoria" value={form.category} onChange={set('category')} options={CATEGORIES} />
            <Select label="Nani aone" value={form.audience} onChange={set('audience')}
                    options={[
                      { value: 'staff', label: 'Wafanyakazi pekee' },
                      { value: 'parents', label: 'Pamoja na wazazi' },
                      { value: 'public', label: 'Wote wa shule' }
                    ]} />
          </div>

          {(form.category === 'certificate' || form.category === 'letter') && (
            <Select label="Mwanafunzi (hiari)" value={form.student_id} onChange={set('student_id')}
                    placeholder="Si ya mwanafunzi maalum"
                    options={students.map((s) => ({ value: s.id, label: fullName(s) }))} />
          )}

          <div>
            <label className="label">Maelezo (hiari)</label>
            <textarea className="input min-h-[60px] resize-y" value={form.description} onChange={set('description')} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa nyaraka"
        message="Nyaraka na faili lake vitafutwa kabisa. Endelea?" confirmLabel="Futa"
      />
    </>
  )
}
