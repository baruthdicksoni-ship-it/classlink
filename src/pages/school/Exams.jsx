import { useState } from 'react'
import { Plus, Pencil, Trash2, FileText, Send, CheckCircle2, Megaphone, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useUpdate, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
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
import { formatDate } from '@/utils/format'
import { required, runValidation } from '@/utils/validate'

const TYPES = [
  { value: 'quiz',     label: 'Jaribio' },
  { value: 'midterm',  label: 'Katikati ya muhula' },
  { value: 'terminal', label: 'Mwisho wa muhula' },
  { value: 'mock',     label: 'Mock' },
  { value: 'national', label: 'Taifa' }
]

// Hatua za mtihani
const STATUS = {
  draft:     { label: 'Rasimu',           tone: 'slate' },
  submitted: { label: 'Inasubiri idhini', tone: 'amber' },
  approved:  { label: 'Imeidhinishwa',    tone: 'blue' },
  published: { label: 'Imetangazwa',      tone: 'green' }
}

const EMPTY = { name: '', exam_type: 'midterm', term_id: '', start_date: '', end_date: '', max_marks: 100 }

export default function Exams() {
  const { can, role } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(null)

  const { data: exams = [], isLoading } = useTable('exams', {
    order: { column: 'created_at', ascending: false }
  })
  const { data: terms = [] } = useTable('terms', { order: { column: 'start_date', ascending: false } })

  const insert = useInsert('exams')
  const update = useUpdate('exams')
  const remove = useDelete('exams')

  const isManager = role === 'school_owner' || role === 'school_admin'
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))
  const termMap = Object.fromEntries(terms.map((t) => [t.id, t.name]))

  function openNew() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true) }
  function openEdit(x) {
    setEditing(x)
    setForm({
      name: x.name, exam_type: x.exam_type, term_id: x.term_id || '',
      start_date: x.start_date || '', end_date: x.end_date || '', max_marks: x.max_marks
    })
    setErrors({}); setOpen(true)
  }

  async function handleSave() {
    const { errors: errs, isValid } = runValidation({
      name:    [() => required(form.name, 'Jina la mtihani')],
      term_id: [() => required(form.term_id, 'Muhula')]
    })
    setErrors(errs)
    if (!isValid) return

    const payload = {
      name: form.name.trim(), exam_type: form.exam_type, term_id: form.term_id,
      start_date: form.start_date || null, end_date: form.end_date || null,
      max_marks: Number(form.max_marks) || 100
    }

    try {
      if (editing) { await update.mutateAsync({ id: editing.id, ...payload }); toast.success('Mtihani umehifadhiwa.') }
      else { await insert.mutateAsync(payload); toast.success('Mtihani umeongezwa.') }
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  // Mtiririko wa kuidhinisha — kupitia RPC
  async function runAction(fn, examId, successMsg) {
    setBusy(examId)
    const { error } = await supabase.rpc(fn, { p_exam_id: examId })
    setBusy(null)
    if (error) toast.error(error.message)
    else {
      toast.success(successMsg)
      qc.invalidateQueries({ queryKey: ['exams'] })
    }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Mtihani umefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  const saving = insert.isPending || update.isPending

  return (
    <>
      <PageHeader
        title="Mitihani"
        subtitle={`${exams.length} mitihani`}
        action={can('exams.manage') && <Button icon={Plus} onClick={openNew}>Ongeza mtihani</Button>}
      />

      <Card>
        {isLoading ? <Spinner /> : exams.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Hakuna mitihani"
            description="Ongeza mtihani ili uweze kuingiza matokeo."
            action={can('exams.manage') && <Button icon={Plus} onClick={openNew}>Ongeza mtihani</Button>}
          />
        ) : (
          <Table minWidth="720px">
            <THead columns={[
              { label: 'Mtihani' }, { label: 'Aina', hideOnMobile: true }, { label: 'Muhula', hideOnMobile: true },
              { label: 'Tarehe', hideOnMobile: true }, { label: 'Hali' }, { label: '', width: 170, align: 'right' }
            ]} />
            <TBody>
              {exams.map((x) => {
                const st = STATUS[x.status] || STATUS.draft
                return (
                  <TR key={x.id}>
                    <TD className="font-medium text-slate-900">{x.name}</TD>
                    <TD hideOnMobile>{TYPES.find((t) => t.value === x.exam_type)?.label || x.exam_type}</TD>
                    <TD hideOnMobile>{termMap[x.term_id] || '—'}</TD>
                    <TD className="text-xs" hideOnMobile>{formatDate(x.start_date)}</TD>
                    <TD><Badge tone={st.tone}>{st.label}</Badge></TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Mwalimu/manager: wasilisha rasimu */}
                        {x.status === 'draft' && can('results.enter') && (
                          <Button size="sm" variant="secondary" icon={Send}
                                  loading={busy === x.id}
                                  onClick={() => runAction('submit_exam', x.id, 'Matokeo yamewasilishwa kwa idhini.')}>
                            Wasilisha
                          </Button>
                        )}

                        {/* Mkuu: idhinisha */}
                        {x.status === 'submitted' && isManager && (
                          <>
                            <Button size="sm" icon={CheckCircle2}
                                    loading={busy === x.id}
                                    onClick={() => runAction('approve_exam', x.id, 'Matokeo yameidhinishwa.')}>
                              Idhinisha
                            </Button>
                            <button
                              onClick={() => runAction('reject_exam', x.id, 'Matokeo yamerudishwa kwa marekebisho.')}
                              className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                              title="Rudisha kwa marekebisho">
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {/* Mkuu: tangaza baada ya idhini */}
                        {x.status === 'approved' && isManager && (
                          <Button size="sm" variant="subtle" icon={Megaphone}
                                  loading={busy === x.id}
                                  onClick={() => runAction('publish_exam', x.id, 'Matokeo yametangazwa.')}>
                            Tangaza
                          </Button>
                        )}

                        {/* Manager: rudisha iliyotangazwa (kufuta) */}
                        {x.status === 'published' && isManager && (
                          <button
                            onClick={() => runAction('reject_exam', x.id, 'Matokeo yameondolewa.')}
                            className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                            title="Ondoa kwenye matangazo">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}

                        {/* Hariri/futa — rasimu pekee */}
                        {can('exams.manage') && x.status === 'draft' && (
                          <>
                            <button onClick={() => openEdit(x)} className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleting(x)} className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={open} onClose={() => setOpen(false)}
        title={editing ? 'Hariri mtihani' : 'Ongeza mtihani'}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Ghairi</Button>
          <Button onClick={handleSave} loading={saving}>Hifadhi</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Jina la mtihani" className="sm:col-span-2" placeholder="Mtihani wa Katikati ya Muhula"
                 value={form.name} onChange={set('name')} error={errors.name} />
          <Select label="Aina" value={form.exam_type} onChange={set('exam_type')} options={TYPES} />
          <Select label="Muhula" value={form.term_id} onChange={set('term_id')} placeholder="Chagua muhula"
                  error={errors.term_id} options={terms.map((t) => ({ value: t.id, label: t.name }))} />
          <Input label="Tarehe ya kuanza" type="date" value={form.start_date} onChange={set('start_date')} />
          <Input label="Tarehe ya kumaliza" type="date" value={form.end_date} onChange={set('end_date')} />
          <Input label="Alama za juu" type="number" min="1" value={form.max_marks} onChange={set('max_marks')} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa mtihani"
        message="Matokeo yote ya mtihani huu yatafutwa. Endelea?" confirmLabel="Futa"
      />
    </>
  )
}
