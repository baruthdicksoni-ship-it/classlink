import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchInput from '@/components/shared/SearchInput'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import StudentForm from './StudentForm'
import { fullName, GENDER_LABELS, STUDENT_STATUS } from '@/utils/format'

const COLUMNS = [
  { label: 'Namba' },
  { label: 'Jina' },
  { label: 'Jinsia' },
  { label: 'Darasa' },
  { label: 'Hali' },
  { label: '', width: 90, align: 'right' }
]

export default function StudentList() {
  const { can } = useAuth()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const { data: students = [], isLoading } = useTable('students', {
    select: 'id, admission_no, first_name, middle_name, last_name, gender, status, class_id, guardian_phone',
    order: { column: 'first_name', ascending: true }
  })

  const { data: classes = [] } = useTable('classes', { order: { column: 'name', ascending: true } })
  const remove = useDelete('students')

  const classMap = useMemo(
    () => Object.fromEntries(classes.map((c) => [c.id, c.stream ? `${c.name} ${c.stream}` : c.name])),
    [classes]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (classFilter && s.class_id !== classFilter) return false
      if (statusFilter && s.status !== statusFilter) return false
      if (!q) return true
      return (
        fullName(s).toLowerCase().includes(q) ||
        s.admission_no?.toLowerCase().includes(q)
      )
    })
  }, [students, search, classFilter, statusFilter])

  function openNew() { setEditing(null); setFormOpen(true) }
  function openEdit(s) { setEditing(s); setFormOpen(true) }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Mwanafunzi amefutwa.')
      setDeleting(null)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Wanafunzi"
        subtitle={`${filtered.length} kati ya ${students.length}`}
        action={
          can('students.create') && (
            <Button icon={Plus} onClick={openNew}>Sajili mwanafunzi</Button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tafuta jina au namba..." />
        <Select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          placeholder="Madarasa yote"
          options={classes.map((c) => ({
            value: c.id,
            label: c.stream ? `${c.name} ${c.stream}` : c.name
          }))}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="Hali zote"
          options={Object.entries(STUDENT_STATUS).map(([k, v]) => ({ value: k, label: v.label }))}
        />
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Hakuna wanafunzi"
            description={search || classFilter ? 'Hakuna anayelingana na utafutaji wako.' : 'Anza kwa kusajili mwanafunzi wa kwanza.'}
            action={can('students.create') && <Button icon={Plus} onClick={openNew}>Sajili mwanafunzi</Button>}
          />
        ) : (
          <Table>
            <THead columns={COLUMNS} />
            <TBody>
              {filtered.map((s) => {
                const status = STUDENT_STATUS[s.status] || { label: s.status, tone: 'slate' }
                return (
                  <TR key={s.id}>
                    <TD className="font-mono text-xs">{s.admission_no}</TD>
                    <TD className="font-medium text-slate-900">{fullName(s)}</TD>
                    <TD>{GENDER_LABELS[s.gender]}</TD>
                    <TD>{classMap[s.class_id] || '—'}</TD>
                    <TD><Badge tone={status.tone}>{status.label}</Badge></TD>
                    <TD align="right">
                      <div className="flex justify-end gap-1">
                        {can('students.edit') && (
                          <button
                            onClick={() => openEdit(s)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                            title="Hariri"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {can('students.delete') && (
                          <button
                            onClick={() => setDeleting(s)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Futa"
                          >
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

      <StudentForm open={formOpen} onClose={() => setFormOpen(false)} student={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title="Futa mwanafunzi"
        message={`Utafuta ${fullName(deleting)} pamoja na mahudhurio na matokeo yake yote. Kitendo hiki hakiwezi kutenguliwa.`}
        confirmLabel="Futa"
      />
    </>
  )
}
