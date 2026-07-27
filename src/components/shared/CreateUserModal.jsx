import { useState, useEffect } from 'react'
import { Copy, Check, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateUser } from '@/hooks/useCreateUser'
import { useToast } from '@/components/ui/Toast'
import { ROLE_LABELS, rolesCreatableBy, ROLES } from '@/config/roles'
import { useTable } from '@/hooks/useSupabaseQuery'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { required, validEmail, validPhone, normalizePhone, minLength, runValidation } from '@/utils/validate'

const EMPTY = { full_name: '', email: '', phone: '', role: '', password: '', gender: '' }

// allowedRoles: kama umepitisha, tunazuia kwa hizo tu (mfano ukurasa wa walimu)
// schoolId: super_admin lazima achague; wengine tunatumia shule yao kiotomatiki
export default function CreateUserModal({ open, onClose, allowedRoles, schoolId, title }) {
  const { role: myRole } = useAuth()
  const toast = useToast()
  const createUser = useCreateUser()

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState(null)   // taarifa za mtumiaji aliyetengenezwa
  const [pickedSchool, setPickedSchool] = useState('')

  const isSuper = myRole === ROLES.SUPER_ADMIN
  const options = (allowedRoles || rolesCreatableBy(myRole))
    .map((r) => ({ value: r, label: ROLE_LABELS[r] }))

  // Super admin anahitaji kuchagua shule (isipokuwa anapotengeneza super_admin mwingine)
  const needsSchoolPicker = isSuper && !schoolId && form.role && form.role !== 'super_admin'
  const { data: schools = [] } = useTable('schools', {
    scopeToSchool: false,
    order: { column: 'name', ascending: true },
    enabled: isSuper
  })

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, role: options.length === 1 ? options[0].value : '' })
      setErrors({})
      setDone(null)
      setCopied(false)
      setPickedSchool('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  function suggestPassword() {
    const base = 'Cl'
    const n = Math.floor(1000 + Math.random() * 9000)
    setForm((p) => ({ ...p, password: `${base}${n}#classlink` }))
  }

  async function handleSubmit() {
    const { errors: errs, isValid } = runValidation({
      full_name: [() => required(form.full_name, 'Jina')],
      email:     [() => required(form.email, 'Barua pepe'), () => validEmail(form.email)],
      role:      [() => required(form.role, 'Cheo')],
      password:  [() => required(form.password, 'Nenosiri'), () => minLength(form.password, 6, 'Nenosiri')],
      phone:     [() => validPhone(form.phone)]
    })
    setErrors(errs)
    if (!isValid) return

    if (needsSchoolPicker && !pickedSchool) {
      setErrors((e) => ({ ...e, school: 'Chagua shule' }))
      return
    }

    try {
      const res = await createUser.mutateAsync({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone ? normalizePhone(form.phone) : null,
        role: form.role,
        password: form.password,
        gender: form.gender || null,
        school_id: schoolId || (needsSchoolPicker ? pickedSchool : undefined)
      })

      // Onyesha taarifa za kumkabidhi mtumiaji
      setDone({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: ROLE_LABELS[form.role]
      })
      toast.success('Mtumiaji ametengenezwa.')
    } catch (e) {
      toast.error(e.message)
    }
  }

  function copyDetails() {
    const text = `ClassLink — Taarifa za kuingia\nJina: ${done.full_name}\nCheo: ${done.role}\nBarua pepe: ${done.email}\nNenosiri: ${done.password}`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Baada ya kufanikiwa — onyesha taarifa za kukabidhi
  if (done) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Mtumiaji ametengenezwa"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDone(null); setForm(EMPTY) }}>
              Ongeza mwingine
            </Button>
            <Button onClick={onClose}>Nimemaliza</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
            <p className="text-sm text-emerald-800">
              Mkabidhi mtumiaji taarifa hizi. Password haitaonekana tena baada ya kufunga dirisha hili.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            {[
              ['Jina', done.full_name],
              ['Cheo', done.role],
              ['Barua pepe', done.email],
              ['Nenosiri', done.password]
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-900">{v}</span>
              </div>
            ))}
          </div>

          <Button variant="secondary" icon={copied ? Check : Copy} onClick={copyDetails} className="w-full">
            {copied ? 'Zimenakiliwa' : 'Nakili taarifa zote'}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Tengeneza mtumiaji'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={createUser.isPending}>Ghairi</Button>
          <Button icon={UserPlus} onClick={handleSubmit} loading={createUser.isPending}
                  disabled={needsSchoolPicker && schools.length === 0}>Tengeneza</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Jina kamili" value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
          {options.length > 1 ? (
            <Select label="Cheo" value={form.role} onChange={set('role')} placeholder="Chagua cheo"
                    error={errors.role} options={options} />
          ) : (
            <Input label="Cheo" value={options[0]?.label || ''} disabled />
          )}
          <Input label="Barua pepe" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Input label="Simu" placeholder="0712345678" value={form.phone} onChange={set('phone')} error={errors.phone} />
          <Select label="Jinsia" value={form.gender} onChange={set('gender')} placeholder="Si lazima"
                  options={[{ value: 'male', label: 'Mume' }, { value: 'female', label: 'Mke' }]} />
          {needsSchoolPicker && (
            schools.length === 0 ? (
              <div className="sm:col-span-2 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                <p className="text-sm font-medium text-amber-800">Hakuna shule bado</p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Lazima usajili shule kwanza kabla ya kutengeneza mmiliki au mtumiaji wake.
                  Funga dirisha hili, nenda <span className="font-medium">Shule → Sajili shule</span>, kisha rudi hapa.
                </p>
              </div>
            ) : (
              <Select label="Shule" value={pickedSchool} onChange={(e) => setPickedSchool(e.target.value)}
                      placeholder="Chagua shule" error={errors.school}
                      options={schools.map((s) => ({ value: s.id, label: s.name }))} />
            )
          )}
        </div>

        <div>
          <label className="label">Nenosiri</label>
          <div className="flex gap-2">
            <Input name="password" value={form.password} onChange={set('password')}
                   error={errors.password} className="flex-1" placeholder="Angalau herufi 6" />
            <Button variant="secondary" onClick={suggestPassword} className="shrink-0">Pendekeza</Button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Utakabidhi nenosiri hili kwa mtumiaji. Anaweza kulibadilisha baadaye.
          </p>
        </div>
      </div>
    </Modal>
  )
}
