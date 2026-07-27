import { useState, useMemo } from 'react'
import { Plus, ShieldAlert, CheckCircle2, XCircle, Trash2, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { fullName, formatDate } from '@/utils/format'
import { required, runValidation } from '@/utils/validate'

const CATEGORIES = [
  { value: 'lateness',        label: 'Kuchelewa' },
  { value: 'absenteeism',     label: 'Kutohudhuria' },
  { value: 'misconduct',      label: 'Tabia mbaya' },
  { value: 'fighting',        label: 'Kugombana/kupigana' },
  { value: 'property_damage', label: 'Kuharibu mali' },
  { value: 'dishonesty',      label: 'Udanganyifu' },
  { value: 'uniform',         label: 'Sare' },
  { value: 'other',           label: 'Nyingine' }
]
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))

const SEVERITY = {
  minor:    { label: 'Ndogo',   tone: 'slate' },
  moderate: { label: 'Wastani', tone: 'amber' },
  serious:  { label: 'Kubwa',   tone: 'red' }
}
const STATUS = {
  open:      { label: 'Wazi',            tone: 'amber' },
  resolved:  { label: 'Imeshughulikiwa', tone: 'green' },
  dismissed: { label: 'Imeachwa',        tone: 'slate' }
}

const EMPTY = { student_id: '', incident_date: new Date().toISOString().slice(0, 10), category: 'misconduct', severity: 'minor', description: '' }

export default function Discipline() {
  const { can, schoolId } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  const [open, setOpen] = useState(false)
  const [resolving, setResolving] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [resolveForm, setResolveForm] = useState({ status: 'resolved', action_taken: '', parent_notified: false })
  const [busy, setBusy] = useState(false)

  const { data: cases = [], isLoading } = useTable('discipline_cases', {
    order: { column: 'created_at', ascending: false }
  })
  const { data: students = [] } = useTable('students', {
    select: 'id, admission_no, first_name, middle_name, last_name',
    filters: { status: 'active' },
    order: { column: 'first_name', ascending: true }
  })

  const insert = useInsert('discipline_cases')
  const remove = useDelete('discipline_cases')

  const studentMap = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, fullName(s)])),
    [students]
  )
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const filtered = statusFilter ? cases.filter((c) => c.status === statusFilter) : cases

  function openNew() { setForm(EMPTY); setErrors({}); setOpen(true) }

  async function handleSave() {
    const { errors: errs, isValid } = runValidation({
      student_id:  [() => required(form.student_id, 'Mwanafunzi')],
      description: [() => required(form.description, 'Maelezo')]
    })
    setErrors(errs)
    if (!isValid) return

    try {
      await insert.mutateAsync({
        student_id: form.student_id,
        incident_date: form.incident_date,
        category: form.category,
        severity: form.severity,
        description: form.description.trim()
      })
      toast.success('Kesi imefunguliwa.')
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  async function handleResolve() {
    setBusy(true)
    const { error } = await supabase.rpc('resolve_discipline_case', {
      p_case_id: resolving.id,
      p_status: resolveForm.status,
      p_action: resolveForm.action_taken || null,
      p_parent_notified: resolveForm.parent_notified
    })
    setBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success('Kesi imeshughulikiwa.')
    qc.invalidateQueries({ queryKey: ['discipline_cases'] })
    setResolving(null)
    setResolveForm({ status: 'resolved', action_taken: '', parent_notified: false })
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Kesi imefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <PageHeader
        title="Nidhamu"
        subtitle={`Kesi ${cases.length}`}
        action={can('discipline.report') && <Button icon={Plus} onClick={openNew}>Fungua kesi</Button>}
      />

      {/* Chuja kwa hali */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[{ v: '', l: 'Zote' }, { v: 'open', l: 'Wazi' }, { v: 'resolved', l: 'Zilizoshughulikiwa' }, { v: 'dismissed', l: 'Zilizoachwa' }].map((f) => (
          <button
            key={f.v}
            onClick={() => setStatusFilter(f.v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.v ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="Hakuna kesi za nidhamu"
            description="Kesi za nidhamu za wanafunzi zitaonekana hapa."
            action={can('discipline.report') && <Button icon={Plus} onClick={openNew}>Fungua kesi</Button>}
          />
        ) : (
          <Table minWidth="760px">
            <THead columns={[
              { label: 'Mwanafunzi' }, { label: 'Aina', hideOnMobile: true }, { label: 'Uzito' },
              { label: 'Tarehe', hideOnMobile: true }, { label: 'Hali' }, { label: '', width: 150, align: 'right' }
            ]} />
            <TBody>
              {filtered.map((c) => {
                const sev = SEVERITY[c.severity] || SEVERITY.minor
                const st = STATUS[c.status] || STATUS.open
                return (
                  <TR key={c.id}>
                    <TD className="font-medium text-slate-900">{studentMap[c.student_id] || '—'}</TD>
                    <TD hideOnMobile>{CAT_LABEL[c.category] || c.category}</TD>
                    <TD><Badge tone={sev.tone}>{sev.label}</Badge></TD>
                    <TD className="text-xs" hideOnMobile>{formatDate(c.incident_date)}</TD>
                    <TD><Badge tone={st.tone}>{st.label}</Badge></TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'open' && can('discipline.manage') && (
                          <Button size="sm" variant="secondary" icon={CheckCircle2}
                                  onClick={() => { setResolving(c); setResolveForm({ status: 'resolved', action_taken: '', parent_notified: false }) }}>
                            Shughulikia
                          </Button>
                        )}
                        {can('discipline.manage') && (
                          <button onClick={() => setDeleting(c)}
                                  className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Fungua kesi */}
      <Modal
        open={open} onClose={() => setOpen(false)} title="Fungua kesi ya nidhamu"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={insert.isPending}>Ghairi</Button>
          <Button onClick={handleSave} loading={insert.isPending}>Fungua kesi</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Mwanafunzi" className="sm:col-span-2" value={form.student_id} onChange={set('student_id')}
                  placeholder="Chagua mwanafunzi" error={errors.student_id}
                  options={students.map((s) => ({ value: s.id, label: fullName(s) }))} />
          <Input label="Tarehe ya tukio" type="date" value={form.incident_date} onChange={set('incident_date')} />
          <Select label="Aina ya kosa" value={form.category} onChange={set('category')} options={CATEGORIES} />
          <Select label="Uzito" className="sm:col-span-2" value={form.severity} onChange={set('severity')}
                  options={[
                    { value: 'minor', label: 'Ndogo' },
                    { value: 'moderate', label: 'Wastani' },
                    { value: 'serious', label: 'Kubwa' }
                  ]} />
          <div className="sm:col-span-2">
            <label className="label">Maelezo ya tukio</label>
            <textarea
              className="input min-h-[90px] resize-y"
              placeholder="Eleza kilichotokea..."
              value={form.description}
              onChange={set('description')}
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
          </div>
        </div>
      </Modal>

      {/* Shughulikia kesi */}
      <Modal
        open={Boolean(resolving)} onClose={() => setResolving(null)} title="Shughulikia kesi"
        footer={<>
          <Button variant="secondary" onClick={() => setResolving(null)} disabled={busy}>Ghairi</Button>
          <Button onClick={handleResolve} loading={busy}>Hifadhi</Button>
        </>}
      >
        {resolving && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">{studentMap[resolving.student_id]}</p>
              <p className="mt-1 text-sm text-slate-600">{resolving.description}</p>
            </div>
            <Select label="Uamuzi" value={resolveForm.status}
                    onChange={(e) => setResolveForm((p) => ({ ...p, status: e.target.value }))}
                    options={[
                      { value: 'resolved', label: 'Imeshughulikiwa (adhabu/onyo)' },
                      { value: 'dismissed', label: 'Imeachwa (hakuna hatua)' }
                    ]} />
            <div>
              <label className="label">Hatua iliyochukuliwa</label>
              <textarea
                className="input min-h-[80px] resize-y"
                placeholder="Mfano: Amepewa onyo, wazazi wamejulishwa..."
                value={resolveForm.action_taken}
                onChange={(e) => setResolveForm((p) => ({ ...p, action_taken: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={resolveForm.parent_notified}
                onChange={(e) => setResolveForm((p) => ({ ...p, parent_notified: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Wazazi wamejulishwa
            </label>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa kesi"
        message="Kesi hii itafutwa kabisa. Endelea?" confirmLabel="Futa"
      />
    </>
  )
}
