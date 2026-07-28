import { useState, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Trash2, Clock } from 'lucide-react'
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
import { required, runValidation } from '@/utils/validate'

const CATEGORIES = [
  { value: 'exam',    label: 'Mtihani', tone: 'blue',  dot: 'bg-blue-500' },
  { value: 'holiday', label: 'Likizo',  tone: 'green', dot: 'bg-emerald-500' },
  { value: 'meeting', label: 'Mkutano', tone: 'amber', dot: 'bg-amber-500' },
  { value: 'event',   label: 'Tukio',   tone: 'slate', dot: 'bg-slate-400' },
  { value: 'other',   label: 'Nyingine', tone: 'slate', dot: 'bg-slate-400' }
]
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]))

const MONTHS = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']
const WEEKDAYS = ['Jtatu', 'Jnne', 'Jtano', 'Alh', 'Ijm', 'Jmosi', 'Jpili']

const iso = (d) => d.toISOString().slice(0, 10)
const EMPTY = { title: '', category: 'event', start_date: iso(new Date()), end_date: '', description: '' }

export default function Calendar() {
  const { can } = useAuth()
  const toast = useToast()

  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const { data: events = [], isLoading } = useTable('calendar_events', {
    order: { column: 'start_date', ascending: true }
  })

  const insert = useInsert('calendar_events')
  const remove = useDelete('calendar_events')
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  // Tengeneza gridi ya mwezi
  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    // Anza Jumatatu (getDay: 0=Jpili)
    let startOffset = first.getDay() - 1
    if (startOffset < 0) startOffset = 6
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.y, cursor.m, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [cursor])

  // Panga matukio kwa tarehe
  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach((e) => {
      const start = new Date(e.start_date)
      const end = e.end_date ? new Date(e.end_date) : start
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = iso(d)
        if (!map[key]) map[key] = []
        map[key].push(e)
      }
    })
    return map
  }, [events])

  const upcoming = useMemo(() => {
    const today = iso(new Date())
    return events.filter((e) => (e.end_date || e.start_date) >= today).slice(0, 8)
  }, [events])

  const todayStr = iso(new Date())

  function openNew() {
    setForm({ ...EMPTY, start_date: iso(new Date(cursor.y, cursor.m, 1)) })
    setErrors({}); setOpen(true)
  }

  function prevMonth() { setCursor((c) => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }) }
  function nextMonth() { setCursor((c) => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }) }

  async function handleSave() {
    const { errors: errs, isValid } = runValidation({
      title:      [() => required(form.title, 'Kichwa')],
      start_date: [() => required(form.start_date, 'Tarehe')]
    })
    setErrors(errs)
    if (!isValid) return
    try {
      await insert.mutateAsync({
        title: form.title.trim(),
        category: form.category,
        start_date: form.start_date,
        end_date: form.end_date || null,
        description: form.description.trim() || null
      })
      toast.success('Tukio limeongezwa.')
      setOpen(false)
    } catch (e) { toast.error(e.message) }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Tukio limefutwa.')
      setDeleting(null)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <PageHeader
        title="Kalenda"
        subtitle="Matukio, mitihani, likizo na mikutano"
        action={can('calendar.manage') && <Button icon={Plus} onClick={openNew}>Ongeza tukio</Button>}
      />

      {isLoading ? <Spinner /> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Kalenda */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">{MONTHS[cursor.m]} {cursor.y}</h3>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={nextMonth} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-3">
              <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1.5 text-center text-[11px] font-semibold uppercase text-slate-400">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((date, i) => {
                  if (!date) return <div key={i} className="aspect-square" />
                  const key = iso(date)
                  const dayEvents = eventsByDate[key] || []
                  const isToday = key === todayStr
                  return (
                    <div key={i} className={`aspect-square rounded-lg border p-1 ${isToday ? 'border-brand-300 bg-brand-50/50' : 'border-transparent hover:bg-slate-50'}`}>
                      <div className={`text-right text-xs ${isToday ? 'font-bold text-brand-700' : 'text-slate-500'}`}>
                        {date.getDate()}
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <div key={e.id} className="flex items-center gap-1 truncate">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CAT[e.category]?.dot || 'bg-slate-400'}`} />
                            <span className="truncate text-[10px] text-slate-600">{e.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && <p className="text-[10px] text-slate-400">+{dayEvents.length - 2}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Matukio yajayo */}
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Matukio yajayo</h3>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Hakuna matukio yajayo"
                          description="Matukio mapya yataonekana hapa." />
            ) : (
              <div className="divide-y divide-slate-50">
                {upcoming.map((e) => {
                  const cat = CAT[e.category] || CAT.event
                  const d = new Date(e.start_date)
                  return (
                    <div key={e.id} className="group flex items-start gap-3 px-5 py-3.5">
                      <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-slate-50 py-1.5">
                        <span className="text-[10px] font-medium uppercase text-slate-400">{MONTHS[d.getMonth()].slice(0, 3)}</span>
                        <span className="text-base font-bold text-slate-900">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{e.title}</p>
                        <div className="mt-1"><Badge tone={cat.tone}>{cat.label}</Badge></div>
                      </div>
                      {can('calendar.manage') && (
                        <button onClick={() => setDeleting(e)}
                                className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)} title="Ongeza tukio"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={insert.isPending}>Ghairi</Button>
          <Button onClick={handleSave} loading={insert.isPending}>Ongeza</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Kichwa cha tukio" className="sm:col-span-2" placeholder="Mfano: Mkutano wa wazazi"
                 value={form.title} onChange={set('title')} error={errors.title} />
          <Select label="Aina" value={form.category} onChange={set('category')} options={CATEGORIES} />
          <Input label="Tarehe" type="date" value={form.start_date} onChange={set('start_date')} error={errors.start_date} />
          <Input label="Tarehe ya mwisho (hiari)" type="date" value={form.end_date} onChange={set('end_date')} />
          <div className="sm:col-span-2">
            <label className="label">Maelezo (hiari)</label>
            <textarea className="input min-h-[70px] resize-y" placeholder="Maelezo zaidi..."
                      value={form.description} onChange={set('description')} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        loading={remove.isPending} title="Futa tukio"
        message="Tukio hili litafutwa. Endelea?" confirmLabel="Futa"
      />
    </>
  )
}
