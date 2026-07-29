import { useState, useMemo } from 'react'
import { Plus, Receipt, Pencil, Trash2, TrendingDown, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useUpdate, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
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
import SearchInput from '@/components/shared/SearchInput'
import { formatMoney, formatDateShort } from '@/utils/format'

const CATEGORIES = [
  { value: 'salary',      label: 'Mishahara' },
  { value: 'utilities',   label: 'Huduma (umeme/maji)' },
  { value: 'supplies',    label: 'Vifaa' },
  { value: 'maintenance', label: 'Matengenezo' },
  { value: 'transport',   label: 'Usafiri' },
  { value: 'food',        label: 'Chakula' },
  { value: 'rent',        label: 'Kodi ya pango' },
  { value: 'other',       label: 'Nyingine' }
]
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))

const METHODS = [
  { value: 'cash',     label: 'Fedha taslimu' },
  { value: 'bank',     label: 'Benki' },
  { value: 'mpesa',    label: 'M-Pesa' },
  { value: 'tigopesa', label: 'Tigo Pesa' },
  { value: 'airtel',   label: 'Airtel Money' },
  { value: 'other',    label: 'Nyingine' }
]
const METHOD_LABEL = Object.fromEntries(METHODS.map((m) => [m.value, m.label]))

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = { title: '', category: 'other', amount: '', expense_date: today(), payment_method: 'cash', payee: '', reference: '', notes: '' }

export default function Expenses() {
  const { can, userId } = useAuth()
  const toast = useToast()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const { data: expenses = [], isLoading } = useTable('expenses', {
    order: { column: 'expense_date', ascending: false }
  })
  const insert = useInsert('expenses')
  const update = useUpdate('expenses')
  const remove = useDelete('expenses')
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const filtered = useMemo(() => {
    let list = expenses
    if (catFilter) list = list.filter((x) => x.category === catFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((x) => x.title.toLowerCase().includes(q) || (x.payee || '').toLowerCase().includes(q))
    }
    return list
  }, [expenses, catFilter, search])

  const totalMonth = useMemo(() => {
    const m = today().slice(0, 7)
    return expenses.filter((x) => (x.expense_date || '').startsWith(m))
      .reduce((sum, x) => sum + Number(x.amount || 0), 0)
  }, [expenses])

  const totalAll = useMemo(() => expenses.reduce((sum, x) => sum + Number(x.amount || 0), 0), [expenses])

  function openNew() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true) }
  function openEdit(x) {
    setEditing(x)
    setForm({
      title: x.title, category: x.category, amount: x.amount,
      expense_date: x.expense_date, payment_method: x.payment_method || 'cash',
      payee: x.payee || '', reference: x.reference || '', notes: x.notes || ''
    })
    setErrors({}); setOpen(true)
  }

  async function handleSave() {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Maelezo yanahitajika'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Weka kiasi sahihi'
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      payment_method: form.payment_method,
      payee: form.payee.trim() || null,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null
    }
    try {
      if (editing) { await update.mutateAsync({ id: editing.id, ...payload }); toast.success('Matumizi yamehifadhiwa.') }
      else { await insert.mutateAsync({ ...payload, recorded_by: userId }); toast.success('Matumizi yameongezwa.') }
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Matumizi yamefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  const saving = insert.isPending || update.isPending

  return (
    <>
      <PageHeader
        title="Matumizi"
        subtitle={`${expenses.length} rekodi`}
        action={can('expenses.manage') && <Button icon={Plus} onClick={openNew}>Ongeza matumizi</Button>}
      />

      {/* Takwimu */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Matumizi mwezi huu" value={formatMoney(totalMonth)} icon={TrendingDown} tone="red" />
        <StatCard label="Jumla ya matumizi" value={formatMoney(totalAll)} icon={Receipt} tone="slate" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="sm:w-72"><SearchInput value={search} onChange={setSearch} placeholder="Tafuta matumizi..." /></div>
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
                placeholder="Kategoria zote" className="sm:w-52" options={CATEGORIES} />
      </div>

      <Card>
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={search || catFilter ? 'Hakuna matumizi yaliyopatikana' : 'Hakuna matumizi bado'}
            description={search || catFilter ? 'Jaribu kigezo kingine.' : 'Rekodi matumizi ya shule ili kuyafuatilia.'}
            action={!search && !catFilter && can('expenses.manage') && <Button icon={Plus} onClick={openNew}>Ongeza matumizi</Button>}
          />
        ) : (
          <Table minWidth="820px">
            <THead columns={[
              { label: 'Maelezo' }, { label: 'Kategoria', hideOnMobile: true },
              { label: 'Tarehe', hideOnMobile: true }, { label: 'Njia', hideOnMobile: true },
              { label: 'Kiasi', align: 'right' },
              { label: '', width: 90, align: 'right' }
            ]} />
            <TBody>
              {filtered.map((x) => (
                <TR key={x.id}>
                  <TD>
                    <span className="font-medium text-slate-900">{x.title}</span>
                    {x.payee && <p className="text-xs text-slate-400">{x.payee}</p>}
                  </TD>
                  <TD hideOnMobile><Badge tone="slate">{CAT_LABEL[x.category]}</Badge></TD>
                  <TD hideOnMobile className="text-slate-500">{formatDateShort(x.expense_date)}</TD>
                  <TD hideOnMobile className="text-slate-500">{METHOD_LABEL[x.payment_method]}</TD>
                  <TD align="right" className="font-semibold tabular-nums text-slate-800">{formatMoney(x.amount)}</TD>
                  <TD align="right">
                    {can('expenses.manage') && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(x)}
                                className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(x)}
                                className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
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

      {/* Ongeza/hariri matumizi */}
      <Modal
        open={open} onClose={() => setOpen(false)}
        title={editing ? 'Hariri matumizi' : 'Ongeza matumizi'}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Ghairi</Button>
          <Button onClick={handleSave} loading={saving}>Hifadhi</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Maelezo" className="sm:col-span-2" placeholder="Mfano: Umeme LUKU, Mshahara wa mlinzi"
                 value={form.title} onChange={set('title')} error={errors.title} />
          <Select label="Kategoria" value={form.category} onChange={set('category')} options={CATEGORIES} />
          <Input label="Kiasi (TZS)" type="number" min="0" placeholder="0"
                 value={form.amount} onChange={set('amount')} error={errors.amount} />
          <Input label="Tarehe" type="date" value={form.expense_date} onChange={set('expense_date')} />
          <Select label="Njia ya malipo" value={form.payment_method} onChange={set('payment_method')} options={METHODS} />
          <Input label="Aliyelipwa (hiari)" placeholder="Jina" value={form.payee} onChange={set('payee')} />
          <Input label="Namba ya risiti (hiari)" placeholder="Rejea" value={form.reference} onChange={set('reference')} />
          <div className="sm:col-span-2">
            <label className="label">Maelezo ya ziada (hiari)</label>
            <textarea className="input min-h-[60px] resize-y" value={form.notes} onChange={set('notes')} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa matumizi"
        message="Rekodi hii ya matumizi itafutwa. Endelea?" confirmLabel="Futa"
      />
    </>
  )
}
