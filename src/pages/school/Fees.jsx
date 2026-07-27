import { useState, useMemo } from 'react'
import { Plus, Wallet, Receipt } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchInput from '@/components/shared/SearchInput'
import StatCard from '@/components/shared/StatCard'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatMoney, fullName, INVOICE_STATUS, PAYMENT_METHODS } from '@/utils/format'
import { required, runValidation } from '@/utils/validate'

export default function Fees() {
  const { can, profile } = useAuth()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(null)

  const [invForm, setInvForm] = useState({ student_id: '', invoice_no: '', total_amount: '', due_date: '' })
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '', note: '' })
  const [errors, setErrors] = useState({})

  const { data: invoices = [], isLoading } = useTable('fee_invoices', {
    order: { column: 'created_at', ascending: false }
  })
  const { data: students = [] } = useTable('students', {
    select: 'id, admission_no, first_name, middle_name, last_name',
    filters: { status: 'active' },
    order: { column: 'first_name', ascending: true }
  })

  const insertInvoice = useInsert('fee_invoices')
  const insertPayment = useInsert('fee_payments')

  const studentMap = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, fullName(s)])),
    [students]
  )

  const totals = useMemo(() => {
    const billed = invoices.reduce((a, i) => a + Number(i.total_amount || 0), 0)
    const paid = invoices.reduce((a, i) => a + Number(i.paid_amount || 0), 0)
    return { billed, paid, balance: billed - paid }
  }, [invoices])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices.filter((i) => {
      if (statusFilter && i.status !== statusFilter) return false
      if (!q) return true
      return (
        i.invoice_no?.toLowerCase().includes(q) ||
        studentMap[i.student_id]?.toLowerCase().includes(q)
      )
    })
  }, [invoices, search, statusFilter, studentMap])

  async function createInvoice() {
    const { errors: errs, isValid } = runValidation({
      student_id:   [() => required(invForm.student_id, 'Mwanafunzi')],
      invoice_no:   [() => required(invForm.invoice_no, 'Namba ya ankara')],
      total_amount: [() => required(invForm.total_amount, 'Kiasi')]
    })
    setErrors(errs)
    if (!isValid) return

    try {
      await insertInvoice.mutateAsync({
        student_id: invForm.student_id,
        invoice_no: invForm.invoice_no.trim(),
        total_amount: Number(invForm.total_amount),
        due_date: invForm.due_date || null
      })
      toast.success('Ankara imetengenezwa.')
      setInvForm({ student_id: '', invoice_no: '', total_amount: '', due_date: '' })
      setInvoiceOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  async function recordPayment() {
    const amount = Number(payForm.amount)
    if (!amount || amount <= 0) {
      setErrors({ amount: 'Weka kiasi sahihi' })
      return
    }

    const balance = Number(payOpen.total_amount) - Number(payOpen.paid_amount)
    if (amount > balance) {
      setErrors({ amount: `Kiasi kinazidi deni la ${formatMoney(balance)}` })
      return
    }

    try {
      await insertPayment.mutateAsync({
        invoice_id: payOpen.id,
        student_id: payOpen.student_id,
        amount,
        method: payForm.method,
        reference: payForm.reference?.trim() || null,
        note: payForm.note?.trim() || null,
        received_by: profile?.id
      })
      toast.success('Malipo yamerekodiwa.')
      setPayForm({ amount: '', method: 'cash', reference: '', note: '' })
      setErrors({})
      setPayOpen(null)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <PageHeader
        title="Ada"
        subtitle={can('fees.manage') ? `Ankara ${invoices.length}` : `Ankara ${invoices.length} · unaona tu`}
        action={can('fees.manage') && <Button icon={Plus} onClick={() => { setErrors({}); setInvoiceOpen(true) }}>Tengeneza ankara</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Jumla ya madai" value={formatMoney(totals.billed)} icon={Wallet} tone="slate" />
        <StatCard label="Zimelipwa" value={formatMoney(totals.paid)} icon={Receipt} tone="green" />
        <StatCard label="Deni" value={formatMoney(totals.balance)} icon={Wallet} tone={totals.balance > 0 ? 'red' : 'green'} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-2/3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tafuta ankara au mwanafunzi..." />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="Hali zote"
          options={Object.entries(INVOICE_STATUS).map(([k, v]) => ({ value: k, label: v.label }))}
        />
      </div>

      <Card>
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Hakuna ankara"
            description="Tengeneza ankara ya kwanza ili kuanza kufuatilia ada."
            action={can('fees.manage') && <Button icon={Plus} onClick={() => setInvoiceOpen(true)}>Tengeneza ankara</Button>}
          />
        ) : (
          <Table>
            <THead columns={[
              { label: 'Ankara' }, { label: 'Mwanafunzi' },
              { label: 'Jumla', align: 'right' }, { label: 'Imelipwa', align: 'right' },
              { label: 'Deni', align: 'right' }, { label: 'Hali' },
              { label: '', width: 90, align: 'right' }
            ]} />
            <TBody>
              {filtered.map((i) => {
                const balance = Number(i.total_amount) - Number(i.paid_amount)
                const st = INVOICE_STATUS[i.status] || { label: i.status, tone: 'slate' }
                return (
                  <TR key={i.id}>
                    <TD className="font-mono text-xs">{i.invoice_no}</TD>
                    <TD className="font-medium text-slate-900">{studentMap[i.student_id] || '—'}</TD>
                    <TD align="right" className="tabular-nums">{formatMoney(i.total_amount)}</TD>
                    <TD align="right" className="tabular-nums text-emerald-600">{formatMoney(i.paid_amount)}</TD>
                    <TD align="right" className={`tabular-nums ${balance > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {formatMoney(balance)}
                    </TD>
                    <TD><Badge tone={st.tone}>{st.label}</Badge></TD>
                    <TD align="right">
                      {can('fees.collect') && balance > 0 && (
                        <Button size="sm" variant="subtle" onClick={() => { setErrors({}); setPayOpen(i) }}>
                          Lipa
                        </Button>
                      )}
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Ankara mpya */}
      <Modal
        open={invoiceOpen} onClose={() => setInvoiceOpen(false)} title="Tengeneza ankara"
        footer={<>
          <Button variant="secondary" onClick={() => setInvoiceOpen(false)}>Ghairi</Button>
          <Button onClick={createInvoice} loading={insertInvoice.isPending}>Tengeneza</Button>
        </>}
      >
        <div className="space-y-4">
          <Select
            label="Mwanafunzi"
            value={invForm.student_id}
            onChange={(e) => setInvForm((f) => ({ ...f, student_id: e.target.value }))}
            placeholder="Chagua mwanafunzi"
            error={errors.student_id}
            options={students.map((s) => ({ value: s.id, label: `${fullName(s)} — ${s.admission_no}` }))}
          />
          <Input
            label="Namba ya ankara"
            placeholder="INV-2026-001"
            value={invForm.invoice_no}
            onChange={(e) => setInvForm((f) => ({ ...f, invoice_no: e.target.value }))}
            error={errors.invoice_no}
          />
          <Input
            label="Kiasi (TZS)"
            type="number"
            min="0"
            value={invForm.total_amount}
            onChange={(e) => setInvForm((f) => ({ ...f, total_amount: e.target.value }))}
            error={errors.total_amount}
          />
          <Input
            label="Tarehe ya mwisho"
            type="date"
            value={invForm.due_date}
            onChange={(e) => setInvForm((f) => ({ ...f, due_date: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Malipo */}
      <Modal
        open={Boolean(payOpen)} onClose={() => setPayOpen(null)} title="Rekodi malipo"
        footer={<>
          <Button variant="secondary" onClick={() => setPayOpen(null)}>Ghairi</Button>
          <Button onClick={recordPayment} loading={insertPayment.isPending}>Hifadhi</Button>
        </>}
      >
        {payOpen && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium text-slate-900">{studentMap[payOpen.student_id]}</p>
              <p className="mt-1 text-slate-500">
                Deni: <span className="font-semibold text-red-600">
                  {formatMoney(Number(payOpen.total_amount) - Number(payOpen.paid_amount))}
                </span>
              </p>
            </div>

            <Input
              label="Kiasi (TZS)"
              type="number"
              min="0"
              value={payForm.amount}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
              error={errors.amount}
            />
            <Select
              label="Njia ya malipo"
              value={payForm.method}
              onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
              options={PAYMENT_METHODS}
            />
            <Input
              label="Kumbukumbu"
              placeholder="Namba ya muamala"
              value={payForm.reference}
              onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
            />
            <Input
              label="Maelezo"
              value={payForm.note}
              onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        )}
      </Modal>
    </>
  )
}
