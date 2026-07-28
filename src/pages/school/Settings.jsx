import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useUpdate, useTable, useInsert, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import { Trash2, Plus, CheckCircle2, Lock, Unlock } from 'lucide-react'

export default function Settings() {
  const { school, refreshProfile, can } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState({ name: '', motto: '', address: '', phone: '', email: '' })
  const [grade, setGrade] = useState({ grade: '', min_marks: '', max_marks: '', remarks: '' })

  const updateSchool = useUpdate('schools')
  const { data: scales = [] } = useTable('grade_scales', { order: { column: 'min_marks', ascending: false } })
  const insertScale = useInsert('grade_scales')
  const deleteScale = useDelete('grade_scales')

  const { data: years = [], refetch: refetchYears } = useTable('academic_years', { order: { column: 'name', ascending: false } })
  const { data: terms = [], refetch: refetchTerms } = useTable('terms', { order: { column: 'start_date', ascending: false } })

  async function setCurrentYear(id) {
    const { error } = await supabase.rpc('set_current_year', { p_year_id: id })
    if (error) { toast.error(error.message); return }
    toast.success('Mwaka wa masomo umebadilishwa.')
    refetchYears()
  }
  async function setCurrentTerm(id) {
    const { error } = await supabase.rpc('set_current_term', { p_term_id: id })
    if (error) { toast.error(error.message); return }
    toast.success('Muhula umebadilishwa.')
    refetchTerms()
  }
  async function setTermStatus(id, status) {
    const { error } = await supabase.rpc('set_term_status', { p_term_id: id, p_status: status })
    if (error) { toast.error(error.message); return }
    toast.success(status === 'closed' ? 'Muhula umefungwa.' : 'Muhula umefunguliwa.')
    refetchTerms()
  }

  useEffect(() => {
    if (school) {
      setForm({
        name: school.name || '',
        motto: school.motto || '',
        address: school.address || '',
        phone: school.phone || '',
        email: school.email || ''
      })
    }
  }, [school])

  async function saveSchool() {
    try {
      await updateSchool.mutateAsync({ id: school.id, ...form })
      await refreshProfile()
      toast.success('Mipangilio imehifadhiwa.')
    } catch (e) { toast.error(e.message) }
  }

  async function addGrade() {
    if (!grade.grade || grade.min_marks === '' || grade.max_marks === '') {
      toast.error('Jaza daraja, alama za chini na za juu.')
      return
    }
    try {
      await insertScale.mutateAsync({
        grade: grade.grade.trim().toUpperCase(),
        min_marks: Number(grade.min_marks),
        max_marks: Number(grade.max_marks),
        remarks: grade.remarks?.trim() || null
      })
      setGrade({ grade: '', min_marks: '', max_marks: '', remarks: '' })
      toast.success('Daraja limeongezwa.')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <PageHeader title="Mipangilio" subtitle="Taarifa za shule na madaraja" />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Taarifa za shule" />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Jina la shule" className="sm:col-span-2" value={form.name}
                     onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label="Kauli mbiu" className="sm:col-span-2" value={form.motto}
                     onChange={(e) => setForm((f) => ({ ...f, motto: e.target.value }))} />
              <Input label="Anwani" value={form.address}
                     onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              <Input label="Simu" value={form.phone}
                     onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <Input label="Barua pepe" type="email" value={form.email}
                     onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="mt-5">
              <Button onClick={saveSchool} loading={updateSchool.isPending}>Hifadhi</Button>
            </div>
          </CardBody>
        </Card>

        {/* Mwaka wa masomo na mihula */}
        {can('settings.manage') && (
          <Card>
            <CardHeader title="Mwaka wa masomo" subtitle="Chagua mwaka na muhula unaotumika sasa" />
            {years.length === 0 ? (
              <CardBody><p className="text-sm text-slate-500">Hakuna miaka ya masomo bado. Ongeza mwaka kupitia usajili.</p></CardBody>
            ) : (
              <div className="divide-y divide-slate-50">
                {years.map((y) => (
                  <div key={y.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{y.name}</span>
                        {y.is_current && <Badge tone="green">Unaotumika</Badge>}
                      </div>
                    </div>
                    {!y.is_current && (
                      <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => setCurrentYear(y.id)}>
                        Weka unaotumika
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Mihula */}
        {can('settings.manage') && terms.length > 0 && (
          <Card>
            <CardHeader title="Mihula" subtitle="Weka muhula unaotumika, fungua au funga" />
            <div className="divide-y divide-slate-50">
              {terms.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{t.name}</span>
                      {t.is_current && <Badge tone="green">Unaotumika</Badge>}
                      <Badge tone={t.status === 'closed' ? 'red' : 'slate'}>
                        {t.status === 'closed' ? 'Umefungwa' : 'Wazi'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {!t.is_current && (
                      <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => setCurrentTerm(t.id)}>
                        Weka
                      </Button>
                    )}
                    {t.status === 'open' ? (
                      <Button size="sm" variant="secondary" icon={Lock} onClick={() => setTermStatus(t.id, 'closed')}>
                        Funga
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" icon={Unlock} onClick={() => setTermStatus(t.id, 'open')}>
                        Fungua
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="Madaraja" subtitle="Yanatumika kupanga matokeo ya mitihani" />
          <Table>
            <THead columns={[
              { label: 'Daraja' }, { label: 'Chini', align: 'right' },
              { label: 'Juu', align: 'right' }, { label: 'Maelezo' },
              { label: '', width: 50, align: 'right' }
            ]} />
            <TBody>
              {scales.map((g) => (
                <TR key={g.id}>
                  <TD className="font-semibold text-slate-900">{g.grade}</TD>
                  <TD align="right" className="tabular-nums">{g.min_marks}</TD>
                  <TD align="right" className="tabular-nums">{g.max_marks}</TD>
                  <TD className="text-slate-500">{g.remarks || '—'}</TD>
                  <TD align="right">
                    <button onClick={() => deleteScale.mutate(g.id)}
                            className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <CardBody className="border-t border-slate-200 bg-slate-50">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <Input placeholder="A" value={grade.grade}
                     onChange={(e) => setGrade((g) => ({ ...g, grade: e.target.value }))} />
              <Input type="number" placeholder="Chini" value={grade.min_marks}
                     onChange={(e) => setGrade((g) => ({ ...g, min_marks: e.target.value }))} />
              <Input type="number" placeholder="Juu" value={grade.max_marks}
                     onChange={(e) => setGrade((g) => ({ ...g, max_marks: e.target.value }))} />
              <Input placeholder="Bora sana" value={grade.remarks}
                     onChange={(e) => setGrade((g) => ({ ...g, remarks: e.target.value }))} />
              <Button icon={Plus} onClick={addGrade} loading={insertScale.isPending}>Ongeza</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
