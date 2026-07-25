import { ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full bg-red-50 p-3">
        <ShieldX className="h-7 w-7 text-red-600" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Huna ruhusa</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Akaunti yako hairuhusiwi kufikia ukurasa huu. Wasiliana na msimamizi wa shule kama unadhani ni kosa.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4
                   text-sm font-medium text-white hover:bg-brand-700"
      >
        Rudi mwanzo
      </Link>
    </div>
  )
}
