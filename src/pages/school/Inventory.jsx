import { useState, useMemo } from 'react'
import { Plus, Package, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useUpdate, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
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

const CATEGORIES = [
  { value: 'stationery',  label: 'Vifaa vya kuandikia' },
  { value: 'furniture',   label: 'Samani' },
  { value: 'electronics', label: 'Umeme/Elektroniki' },
  { value: 'cleaning',    label: 'Usafi' },
  { value: 'sports',      label: 'Michezo' },
  { value: 'lab',         label: 'Maabara' },
  { value: 'kitchen',     label: 'Jikoni' },
  { value: 'books',       label: 'Vitabu' },
  { value: 'other',       label: 'Nyingine' }
]
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))

const EMPTY = { name: '', category: 'other', unit: 'kipande', quantity: 0, min_quantity: 0, location: '', notes: '' }

export default function Inventory() {
  const { can, userId } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [moving, setMoving] = useState(null)       // { item, type }
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [moveQty, setMoveQty] = useState('')
  const [moveReason, setMoveReason] = useState('')
  const [busy, setBusy] = useState(false)

  const { data: items = [], isLoading } = useTable('inventory_items', {
    order: { column: 'name', ascending: true }
  })

  const insert = useInsert('inventory_items')
  const update = useUpdate('inventory_items')
  const remove = useDelete('inventory_items')
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((i) => i.name.toLowerCase().includes(q) || CAT_LABEL[i.category]?.toLowerCase().includes(q))
  }, [items, search])

  const lowStock = useMemo(() => items.filter((i) => i.min_quantity > 0 && Number(i.quantity) <= Number(i.min_quantity)), [items])

  function openNew() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true) }
  function openEdit(i) {
    setEditing(i)
    setForm({
      name: i.name, category: i.category, unit: i.unit || 'kipande',
      quantity: i.quantity, min_quantity: i.min_quantity,
      location: i.location || '', notes: i.notes || ''
    })
    setErrors({}); setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setErrors({ name: 'Jina la kifaa linahitajika' }); return }
    const payload = {
      name: form.name.trim(), category: form.category, unit: form.unit.trim() || 'kipande',
      quantity: Number(form.quantity) || 0, min_quantity: Number(form.min_quantity) || 0,
      location: form.location.trim() || null, notes: form.notes.trim() || null
    }
    try {
      if (editing) { await update.mutateAsync({ id: editing.id, ...payload }); toast.success('Kifaa kimehifadhiwa.') }
      else { await insert.mutateAsync(payload); toast.success('Kifaa kimeongezwa.') }
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  async function handleMove() {
    const qty = Number(moveQty)
    if (!qty || qty <= 0) { toast.error('Weka kiasi sahihi.'); return }
    setBusy(true)
    const { error } = await supabase.from('stock_movements').insert({
      item_id: moving.item.id,
      movement_type: moving.type,
      quantity: qty,
      reason: moveReason.trim() || null,
      moved_by: userId
    })
    setBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success(moving.type === 'in' ? 'Stock imeongezwa.' : 'Stock imetolewa.')
    qc.invalidateQueries({ queryKey: ['inventory_items'] })
    setMoving(null); setMoveQty(''); setMoveReason('')
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Kifaa kimefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  const saving = insert.isPending || update.isPending

  return (
    <>
      <PageHeader
        title="Vifaa vya Shule"
        subtitle={`${items.length} vifaa`}
        action={can('inventory.manage') && <Button icon={Plus} onClick={openNew}>Ongeza kifaa</Button>}
      />

      {/* Takwimu */}
      {items.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Aina za vifaa" value={items.length} icon={Package} tone="blue" />
          <StatCard label="Stock ndogo" value={lowStock.length} icon={AlertTriangle}
                    tone={lowStock.length > 0 ? 'red' : 'green'} />
        </div>
      )}

      <div className="mb-4 sm:w-80">
        <SearchInput value={search} onChange={setSearch} placeholder="Tafuta kifaa..." />
      </div>

      <Card>
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search ? 'Hakuna kifaa kilichopatikana' : 'Hakuna vifaa bado'}
            description={search ? 'Jaribu jina lingine.' : 'Ongeza vifaa vya shule ili kuvifuatilia.'}
            action={!search && can('inventory.manage') && <Button icon={Plus} onClick={openNew}>Ongeza kifaa</Button>}
          />
        ) : (
          <Table minWidth="720px">
            <THead columns={[
              { label: 'Kifaa' }, { label: 'Kategoria', hideOnMobile: true }, { label: 'Kiasi' },
              { label: 'Kiwango cha chini', hideOnMobile: true },
              { label: '', width: 160, align: 'right' }
            ]} />
            <TBody>
              {filtered.map((i) => {
                const low = i.min_quantity > 0 && Number(i.quantity) <= Number(i.min_quantity)
                return (
                  <TR key={i.id}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{i.name}</span>
                        {low && <AlertTriangle className="h-3.5 w-3.5 text-red-500" title="Stock ndogo" />}
                      </div>
                      {i.location && <p className="text-xs text-slate-400">{i.location}</p>}
                    </TD>
                    <TD hideOnMobile>{CAT_LABEL[i.category]}</TD>
                    <TD>
                      <span className={`font-semibold tabular-nums ${low ? 'text-red-600' : 'text-slate-800'}`}>
                        {Number(i.quantity)}
                      </span>
                      <span className="text-xs text-slate-400"> {i.unit}</span>
                    </TD>
                    <TD className="tabular-nums text-slate-500" hideOnMobile>{Number(i.min_quantity) || '—'}</TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        {can('inventory.manage') && (
                          <>
                            <button onClick={() => { setMoving({ item: i, type: 'in' }); setMoveQty(''); setMoveReason('') }}
                                    className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Ingiza">
                              <ArrowDownCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setMoving({ item: i, type: 'out' }); setMoveQty(''); setMoveReason('') }}
                                    className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Toa">
                              <ArrowUpCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => openEdit(i)}
                                    className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleting(i)}
                                    className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
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

      {/* Ongeza/hariri kifaa */}
      <Modal
        open={open} onClose={() => setOpen(false)}
        title={editing ? 'Hariri kifaa' : 'Ongeza kifaa'}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Ghairi</Button>
          <Button onClick={handleSave} loading={saving}>Hifadhi</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Jina la kifaa" className="sm:col-span-2" placeholder="Mfano: Chaki, Madawati"
                 value={form.name} onChange={set('name')} error={errors.name} />
          <Select label="Kategoria" value={form.category} onChange={set('category')} options={CATEGORIES} />
          <Input label="Kipimo" placeholder="kipande, box, kg" value={form.unit} onChange={set('unit')} />
          {!editing && (
            <Input label="Kiasi cha awali" type="number" min="0" value={form.quantity} onChange={set('quantity')} />
          )}
          <Input label="Kiwango cha chini (tahadhari)" type="number" min="0"
                 value={form.min_quantity} onChange={set('min_quantity')} />
          <Input label="Mahali kilipo" className="sm:col-span-2" placeholder="Mfano: Ghala kuu"
                 value={form.location} onChange={set('location')} />
        </div>
        {editing && (
          <p className="mt-3 text-xs text-slate-400">
            Kubadilisha kiasi, tumia vitufe vya “Ingiza” au “Toa” kwenye orodha ili kuweka historia.
          </p>
        )}
      </Modal>

      {/* Ingiza/Toa stock */}
      <Modal
        open={Boolean(moving)} onClose={() => setMoving(null)}
        title={moving?.type === 'in' ? 'Ingiza stock' : 'Toa stock'}
        footer={<>
          <Button variant="secondary" onClick={() => setMoving(null)} disabled={busy}>Ghairi</Button>
          <Button onClick={handleMove} loading={busy}>{moving?.type === 'in' ? 'Ingiza' : 'Toa'}</Button>
        </>}
      >
        {moving && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">{moving.item.name}</p>
              <p className="text-xs text-slate-500">Kiasi cha sasa: {Number(moving.item.quantity)} {moving.item.unit}</p>
            </div>
            <Input label={`Kiasi cha ku${moving.type === 'in' ? 'ingiza' : 'toa'}`} type="number" min="1"
                   value={moveQty} onChange={(e) => setMoveQty(e.target.value)} autoFocus />
            <div>
              <label className="label">Sababu (hiari)</label>
              <textarea className="input min-h-[60px] resize-y"
                        placeholder={moving.type === 'in' ? 'Mfano: Manunuzi mapya' : 'Mfano: Matumizi ya darasa'}
                        value={moveReason} onChange={(e) => setMoveReason(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa kifaa"
        message="Kifaa hiki na historia yake vitafutwa. Endelea?" confirmLabel="Futa"
      />
    </>
  )
}
