import { useState, useMemo } from 'react'
import { Plus, CalendarCheck, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
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
import { formatDate } from '@/utils/format'
import { required, runValidation } from '@/utils/validate'

const LEAVE_TYPES = [
  { value: 'annual',       label: 'Likizo ya mwaka' },
  { value: 'sick',         label: 'Ugonjwa' },
  { value: 'maternity',    label: 'Uzazi (mama)' },
  { value: 'paternity',    label: 'Uzazi (baba)' },
  { value: 'compassionate', label: 'Msiba/dharura' },
  { value: 'study',        label: 'Masomo' },
  { value: 'other',        label: 'Nyingine' }
]
const TYPE_LABEL = Object.fromEntries(LEAVE_TYPES.map((t) => [t.value, t.label]))

const STATUS = {
  pending:   { label: 'Inasubiri', tone: 'amber' },
  approved:  { label: 'Imeidhinishwa', tone: 'green' },
  rejected:  { label: 'Imekataliwa', tone: 'red' },
  cancelled: { label: 'Imeghairiwa', tone: 'slate' }
}

const EMPTY = { leave_type: 'annual', start_date: '', end_date: '', reason: '' }

export default function Leave() {
  const { can, userId, profile } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  const [open, setOpen] = useState(false)
  const [reviewing, setReviewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [reviewNote, setReviewNote] = useState('')

  const canManage = can('leave.manage')

  const { data: requests = [], isLoading } = useTable('leave_requests', {
    order: { column: 'created_at', ascending: false }
  })
  const { data: profiles = [] } = useTable('profiles', { select: 'id, full_name' })

  const insert = useInsert('leave_requests')
  const remove = useDelete('leave_requests')

  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p.full_name])), [profiles])
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  function openNew() { setForm(EMPTY); setErrors({}); setOpen(true) }

  async function handleSave() {
    const { errors: errs, isValid } = runValidation({
      start_date: [() => required(form.start_date, 'Tarehe ya kuanza')],
      end_date:   [() => required(form.end_date, 'Tarehe ya mwisho')]
    })
    setErrors(errs)
    if (!isValid) return
    if (form.end_date < form.start_date) {
      setErrors({ end_date: 'Tarehe ya mwisho iwe baada ya kuanza' })
      return
    }
    try {
      await insert.mutateAsync({
        profile_id: userId,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim() || null
      })
      toast.success('Ombi la likizo limetumwa.')
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  async function review(status) {
    setBusy(true)
    const { error } = await supabase.rpc('review_leave', {
      p_leave_id: reviewing.id,
      p_status: status,
      p_note: reviewNote || null
    })
    setBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success(status === 'approved' ? 'Likizo imeidhinishwa.' : 'Ombi limekataliwa.')
    qc.invalidateQueries({ queryKey: ['leave_requests'] })
    setReviewing(null)
    setReviewNote('')
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Ombi limefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  const days = (a, b) => {
    if (!a || !b) return 0
    return Math.round((new Date(b) - new Date(a)) / 86400000) + 1
  }

  return (
    <>
      <PageHeader
        title="Likizo"
        subtitle={canManage ? `Maombi ${requests.length}` : 'Maombi yangu ya likizo'}
        action={can('leave.request') && <Button icon={Plus} onClick={openNew}>Omba likizo</Button>}
      />

      <Card>
        {isLoading ? <Spinner /> : requests.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Hakuna maombi ya likizo"
            description={can('leave.request') ? 'Omba likizo yako kwa kubofya kitufe hapo juu.' : 'Maombi ya likizo yataonekana hapa.'}
            action={can('leave.request') && <Button icon={Plus} onClick={openNew}>Omba likizo</Button>}
          />
        ) : (
          <Table minWidth="720px">
            <THead columns={[
              ...(canManage ? [{ label: 'Mfanyakazi' }] : []),
              { label: 'Aina' }, { label: 'Muda', hideOnMobile: true }, { label: 'Siku', hideOnMobile: true },
              { label: 'Hali' }, { label: '', width: 130, align: 'right' }
            ]} />
            <TBody>
              {requests.map((r) => {
                const st = STATUS[r.status] || STATUS.pending
                const isMine = r.profile_id === userId
                return (
                  <TR key={r.id}>
                    {canManage && <TD className="font-medium text-slate-900">{profileMap[r.profile_id] || '—'}</TD>}
                    <TD className={canManage ? '' : 'font-medium text-slate-900'}>{TYPE_LABEL[r.leave_type]}</TD>
                    <TD className="text-xs" hideOnMobile>{formatDate(r.start_date)} – {formatDate(r.end_date)}</TD>
                    <TD hideOnMobile>{days(r.start_date, r.end_date)}</TD>
                    <TD><Badge tone={st.tone}>{st.label}</Badge></TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && r.status === 'pending' && (
                          <Button size="sm" variant="secondary" icon={CheckCircle2}
                                  onClick={() => { setReviewing(r); setReviewNote('') }}>
                            Kagua
                          </Button>
                        )}
                        {isMine && r.status === 'pending' && (
                          <button onClick={() => setDeleting(r)}
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

      {/* Omba likizo */}
      <Modal
        open={open} onClose={() => setOpen(false)} title="Omba likizo"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={insert.isPending}>Ghairi</Button>
          <Button onClick={handleSave} loading={insert.isPending}>Tuma ombi</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Aina ya likizo" className="sm:col-span-2" value={form.leave_type} onChange={set('leave_type')} options={LEAVE_TYPES} />
          <Input label="Kuanzia" type="date" value={form.start_date} onChange={set('start_date')} error={errors.start_date} />
          <Input label="Hadi" type="date" value={form.end_date} onChange={set('end_date')} error={errors.end_date} />
          <div className="sm:col-span-2">
            <label className="label">Sababu (hiari)</label>
            <textarea className="input min-h-[70px] resize-y" placeholder="Eleza sababu ya likizo..."
                      value={form.reason} onChange={set('reason')} />
          </div>
        </div>
      </Modal>

      {/* Kagua likizo */}
      <Modal
        open={Boolean(reviewing)} onClose={() => setReviewing(null)} title="Kagua ombi la likizo"
        footer={<>
          <Button variant="secondary" onClick={() => review('rejected')} loading={busy} icon={XCircle}>Kataa</Button>
          <Button onClick={() => review('approved')} loading={busy} icon={CheckCircle2}>Idhinisha</Button>
        </>}
      >
        {reviewing && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">{profileMap[reviewing.profile_id]}</p>
              <p className="mt-1 text-sm text-slate-600">
                {TYPE_LABEL[reviewing.leave_type]} · {formatDate(reviewing.start_date)} – {formatDate(reviewing.end_date)}
                {' '}({days(reviewing.start_date, reviewing.end_date)} siku)
              </p>
              {reviewing.reason && <p className="mt-2 text-sm text-slate-500">{reviewing.reason}</p>}
            </div>
            <div>
              <label className="label">Maoni (hiari)</label>
              <textarea className="input min-h-[70px] resize-y" placeholder="Maoni kuhusu uamuzi..."
                        value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa ombi"
        message="Ombi lako la likizo litafutwa. Endelea?" confirmLabel="Futa"
      />
    </>
  )
}
