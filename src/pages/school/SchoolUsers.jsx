import { useState, useMemo } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTable, useUpdate } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
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
import { ROLE_LABELS, rolesCreatableBy } from '@/config/roles'
import { formatDate } from '@/utils/format'

const ROLE_TONES = {
  school_admin: 'amber', teacher: 'green', parent: 'slate', student: 'slate'
}

export default function SchoolUsers() {
  const { role, can } = useAuth()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: users = [], isLoading } = useTable('profiles', {
    select: 'id, full_name, email, phone, role, is_active, created_at',
    order: { column: 'created_at', ascending: false }
  })
  const update = useUpdate('profiles')

  // Onyesha watu ambao mimi ninaweza kuwasimamia (si mimi mwenyewe, si owner kama mimi ni admin)
  const manageable = useMemo(() => {
    const creatable = rolesCreatableBy(role)
    return users.filter((u) => creatable.includes(u.role))
  }, [users, role])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return manageable.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      if (!q) return true
      return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    })
  }, [manageable, search, roleFilter])

  async function toggleActive(u) {
    try {
      await update.mutateAsync({ id: u.id, is_active: !u.is_active })
      toast.success(u.is_active ? 'Mtumiaji amesimamishwa.' : 'Mtumiaji amerejeshwa.')
    } catch (e) { toast.error(e.message) }
  }

  const roleOptions = rolesCreatableBy(role).map((r) => ({ value: r, label: ROLE_LABELS[r] }))

  return (
    <>
      <PageHeader
        title="Watumiaji"
        subtitle="Walimu, wazazi na watumiaji wengine wa shule"
        action={can('users.create') && (
          <Button icon={UserPlus} onClick={() => setCreateOpen(true)}>Tengeneza mtumiaji</Button>
        )}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-2/3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tafuta jina au barua pepe..." />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                placeholder="Vyeo vyote" options={roleOptions} />
      </div>

      <Card>
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Hakuna watumiaji"
            description="Tengeneza mwalimu wa kwanza, kisha umkabidhi taarifa za kuingia."
            action={can('users.create') && (
              <Button icon={UserPlus} onClick={() => setCreateOpen(true)}>Tengeneza mtumiaji</Button>
            )}
          />
        ) : (
          <Table>
            <THead columns={[
              { label: 'Jina' }, { label: 'Mawasiliano' }, { label: 'Cheo' },
              { label: 'Hali' }, { label: 'Tarehe' }
            ]} />
            <TBody>
              {filtered.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium text-slate-900">{u.full_name}</TD>
                  <TD className="text-xs text-slate-500">
                    <div>{u.email}</div>
                    {u.phone && <div>{u.phone}</div>}
                  </TD>
                  <TD><Badge tone={ROLE_TONES[u.role] || 'slate'}>{ROLE_LABELS[u.role]}</Badge></TD>
                  <TD>
                    <button onClick={() => toggleActive(u)}>
                      <Badge tone={u.is_active ? 'green' : 'slate'}>
                        {u.is_active ? 'Hai' : 'Amesimamishwa'}
                      </Badge>
                    </button>
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
        title="Tengeneza mtumiaji wa shule"
      />
    </>
  )
}
