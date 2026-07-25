import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUpdate, useTable, useInsert, useDelete } from '@/hooks/useSupabaseQuery'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/shared/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Table, THead, TBody, TR, TD } from '@/components/ui/Table'
import { Trash2, Plus } from 'lucide-react'

export default function Settings() {
  const { school, refreshProfile } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState({ name: '', motto: '', address: '', phone: '', email: '' })
  const [grade, setGrade] = useState({ grade: '', min_marks: '', max_marks: '', remarks: '' })

  const updateSchool = useUpdate('schools')
  const { data: scales = [] } = useTable('grade_scales', { order: { column: 'min_marks', ascending: false } })
  const insertScale = useInsert('grade_scales')
  const deleteScale = useDelete('grade_scales')

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
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
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
