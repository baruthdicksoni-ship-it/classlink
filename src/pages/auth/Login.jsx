import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { GraduationCap, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'

export default function Login() {
  const { signIn, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(location.state?.error || null)

  if (loading) return <Spinner full label="Inapakia..." />
  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Jaza barua pepe na nenosiri.')
      return
    }

    setSubmitting(true)
    const res = await signIn(email, password)
    setSubmitting(false)
    if (!res.ok) setError(res.error)
  }

  return (
    <div className="flex min-h-screen">
      {/* Upande wa kushoto — nembo */}
      <div className="hidden w-1/2 flex-col justify-between bg-brand-700 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
            <GraduationCap className="h-6 w-6 text-brand-700" />
          </div>
          <span className="text-xl font-bold text-white">ClassLink</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight text-white">
            Mfumo kamili wa<br />usimamizi wa shule
          </h1>
          <p className="mt-4 max-w-md text-brand-100">
            Wanafunzi, mahudhurio, mitihani, matokeo na ada — mahali pamoja,
            kwa lugha unayoielewa.
          </p>
        </div>

        <p className="text-sm text-brand-200">© {new Date().getFullYear()} ClassLink</p>
      </div>

      {/* Upande wa kulia — fomu */}
      <div className="flex w-full items-center justify-center bg-white px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">ClassLink</span>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900">Karibu tena</h2>
          <p className="mt-1.5 text-sm text-slate-500">Ingia kwenye akaunti yako kuendelea.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Barua pepe"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="jina@shule.ac.tz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Nenosiri"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" size="lg" loading={submitting} className="w-full">
              Ingia
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Umesahau nenosiri? Wasiliana na msimamizi wa shule yako.
          </p>
        </div>
      </div>
    </div>
  )
}
