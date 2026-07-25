import { useState, useMemo } from 'react'
import { UserPlus, Users, Building2 } from 'lucide-react'
import { useTable } from '@/hooks/useSupabaseQuery'
import PageHeader from '@/components/shared/PageHeader'
import SearchInput from '@/components/shared/SearchInput'
import CreateUserModal from '@/components/shared/CreateUserModal'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { ROLE_LABELS } from '@/config/roles'
import { formatDate } from '@/utils/format'

const ROLE_TONES = {
  super_admin: 'red',
  school_owner: 'blue',
  school_admin: 'amber',
  teacher: 'green',
  parent: 'slate',
  student: 'slate'
}

export default function PlatformUsers() {
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: users = [], isLoading } = useTable('profiles', {
    select: 'id, full_name, email, role, school_id, is_active, created_at',
    scopeToSchool: false,
    order: { column: 'created_at', ascending: false }
  })
  const { data: schools = [] } = useTable('schools', {
    scopeToSchool: false,
    order: { column: 'name', ascending: true }
  })

  const schoolMap = useMemo(
    () => Object.fromEntries(schools.map((s) => [s.id, s.name])),
    [schools]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (schoolFilter && u.school_id !== schoolFilter) return false
      if (!q) return true
      return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    })
  }, [users, search, schoolFilter])

  return (
    <>
      <PageHeader
        title="Watumiaji"
        subtitle={`${users.length} watumiaji kwenye mfumo`}
        action={<Button icon={UserPlus} onClick={() => setCreateOpen(true)}>Tengeneza mtumiaji</Button>}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-2/3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tafuta jina au barua pepe..." />
        <Select
          value={schoolFilter}
          onChange={(e) => setSchoolFilter(e.target.value)}
          placeholder="Shule zote"
          options={schools.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>

      <Card>
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Hakuna watumiaji"
            description="Tengeneza mmiliki au mkuu wa shule ili kuanza."
            action={<Button icon={UserPlus} onClick={() => setCreateOpen(true)}>Tengeneza mtumiaji</Button>}
          />
        ) : (
          <Table>
            <THead columns={[
              { label: 'Jina' }, { label: 'Barua pepe' }, { label: 'Cheo' },
              { label: 'Shule' }, { label: 'Hali' }, { label: 'Tarehe' }
            ]} />
            <TBody>
              {filtered.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium text-slate-900">{u.full_name}</TD>
                  <TD className="text-xs text-slate-500">{u.email}</TD>
                  <TD><Badge tone={ROLE_TONES[u.role] || 'slate'}>{ROLE_LABELS[u.role]}</Badge></TD>
                  <TD className="text-xs">{u.school_id ? schoolMap[u.school_id] : '—'}</TD>
                  <TD>
                    <Badge tone={u.is_active ? 'green' : 'slate'}>
                      {u.is_active ? 'Hai' : 'Amesimamishwa'}
                    </Badge>
                  </TD>
                  <TD className="text-xs">{formatDate(u.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tengeneza mtumiaji"
      />
    </>
  )
}
