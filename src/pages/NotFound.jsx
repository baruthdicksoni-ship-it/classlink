import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full bg-brand-50 p-4">
        <FileQuestion className="h-8 w-8 text-brand-600" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-slate-900">Ukurasa haupo</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Ukurasa uliouomba haupatikani. Huenda umehamishwa au anwani si sahihi.
      </p>
      <Link to="/" className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700">
        Rudi mwanzo
      </Link>
    </div>
  )
}
