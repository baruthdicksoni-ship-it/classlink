import { useState, useMemo } from 'react'
import { Plus, Trash2, Receipt, Layers, FileStack, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useInsert, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/shared/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatMoney } from '@/utils/format'

const className = (c) => (c.stream ? `${c.name} ${c.stream}` : c.name)

export default function FeeStructures() {
  const { can } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  const [classId, setClassId] = useState('')
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [genOpen, setGenOpen] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '' })
  const [errors, setErrors] = useState({})

  const { data: classes = [] } = useTable('classes', { order: { column: 'name', ascending: true } })
  const { data: structures = [], isLoading } = useTable('fee_structures', {
    order: { column: 'created_at', ascending: true }
  })

  const insert = useInsert('fee_structures')
  const remove = useDelete('fee_structures')

  // Vipengele vya ada vya darasa lililochaguliwa
  const items = useMemo(
    () => (classId ? structures.filter((s) => s.class_id === classId) : []),
    [structures, classId]
  )
  const total = useMemo(() => items.reduce((sum, x) => sum + Number(x.amount || 0), 0), [items])

  // Muhtasari: kila darasa na jumla yake
  const byClass = useMemo(() => {
    const map = {}
    structures.forEach((s) => {
      map[s.class_id] = (map[s.class_id] || 0) + Number(s.amount || 0)
    })
    return map
  }, [structures])

  async function handleAdd() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Jina linahitajika'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Weka kiasi sahihi'
    if (!classId) { toast.error('Chagua darasa kwanza.'); return }
    if (Object.keys(errs).length) { setErrors(errs); return }

    try {
      await insert.mutateAsync({
        class_id: classId,
        name: form.name.trim(),
        amount: Number(form.amount)
      })
      toast.success('Kipengele cha ada kimeongezwa.')
      setForm({ name: '', amount: '' })
      setErrors({})
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Kipengele kimefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  async function handleGenerate() {
    setGenerating(true)
    const { data, error } = await supabase.rpc('generate_invoices_for_class', {
      p_class_id: classId,
      p_term_id: null,
      p_due_date: dueDate || null
    })
    setGenerating(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Ankara ${data || 0} zimetengenezwa.`)
    qc.invalidateQueries({ queryKey: ['fee_invoices'] })
    setGenOpen(false)
    setDueDate('')
  }

  const selectedClass = classes.find((c) => c.id === classId)

  return (
    <>
      <PageHeader
        title="Muundo wa Ada"
        subtitle="Weka ada kwa kila darasa, kisha tengeneza ankara"
      />

      {/* Chagua darasa */}
      <Card className="mb-6">
        <div className="p-5">
          <label className="label">Chagua darasa</label>
          <Select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            placeholder="Chagua darasa kuona/kuweka ada"
            options={classes.map((c) => ({
              value: c.id,
              label: `${className(c)}${byClass[c.id] ? ` — ${formatMoney(byClass[c.id])}` : ' — hakuna ada'}`
            }))}
          />
        </div>
      </Card>

      {!classId ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="Chagua darasa"
            description="Chagua darasa hapo juu ili kuona au kuweka muundo wa ada yake."
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader
              title={`Ada ya ${selectedClass ? className(selectedClass) : ''}`}
              subtitle={items.length ? `Vipengele ${items.length}` : undefined}
              action={can('fees.manage') && (
                <Button size="sm" icon={Plus} onClick={() => { setForm({ name: '', amount: '' }); setErrors({}); setOpen(true) }}>
                  Ongeza kipengele
                </Button>
              )}
            />
            {isLoading ? <Spinner /> : items.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Hakuna ada bado"
                description="Ongeza vipengele vya ada (mfano: ada ya masomo, michezo, chakula)."
                action={can('fees.manage') && <Button icon={Plus} onClick={() => setOpen(true)}>Ongeza kipengele</Button>}
              />
            ) : (
              <>
                <div className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <span className="flex-1 font-medium text-slate-900">{item.name}</span>
                      <span className="font-semibold tabular-nums text-slate-800">{formatMoney(item.amount)}</span>
                      {can('fees.manage') && (
                        <button onClick={() => setDeleting(item)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Jumla */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
                  <span className="font-semibold text-slate-900">Jumla ya ada</span>
                  <span className="font-heading text-lg font-bold text-brand-600">{formatMoney(total)}</span>
                </div>
              </>
            )}
          </Card>

          {/* Tengeneza ankara */}
          {can('fees.manage') && items.length > 0 && (
            <Card className="mt-6">
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <FileStack className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Tengeneza ankara kwa darasa zima</p>
                    <p className="text-sm text-slate-500">
                      Kila mwanafunzi wa darasa hili atapata ankara ya {formatMoney(total)}.
                    </p>
                  </div>
                </div>
                <Button icon={FileStack} onClick={() => setGenOpen(true)}>Tengeneza ankara</Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Ongeza kipengele */}
      <Modal
        open={open} onClose={() => setOpen(false)} title="Ongeza kipengele cha ada"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={insert.isPending}>Ghairi</Button>
          <Button onClick={handleAdd} loading={insert.isPending}>Ongeza</Button>
        </>}
      >
        <div className="space-y-4">
          <Input label="Jina la ada" placeholder="Mfano: Ada ya masomo, Michezo, Chakula"
                 value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={errors.name} />
          <Input label="Kiasi (TZS)" type="number" min="0" placeholder="0"
                 value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} error={errors.amount} />
        </div>
      </Modal>

      {/* Thibitisha kutengeneza ankara */}
      <Modal
        open={genOpen} onClose={() => setGenOpen(false)} title="Tengeneza ankara"
        footer={<>
          <Button variant="secondary" onClick={() => setGenOpen(false)} disabled={generating}>Ghairi</Button>
          <Button onClick={handleGenerate} loading={generating}>Tengeneza</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl bg-blue-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />
            <p className="text-sm text-blue-800">
              Kila mwanafunzi anayesoma darasa hili atapata ankara ya {formatMoney(total)}.
              Wenye ankara ya muhula huu tayari hawataongezewa.
            </p>
          </div>
          <Input label="Tarehe ya mwisho ya malipo (hiari)" type="date"
                 value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa kipengele"
        message="Kipengele hiki cha ada kitafutwa. Endelea?" confirmLabel="Futa"
      />
    </>
  )
}
