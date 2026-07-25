import { Loader2 } from 'lucide-react'

export default function Spinner({ label = 'Inapakia...', full = false }) {
  const content = (
    <div className="flex flex-col items-center gap-3 text-slate-500">
      <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
  if (full) {
    return <div className="flex min-h-[60vh] items-center justify-center">{content}</div>
  }
  return <div className="flex items-center justify-center py-12">{content}</div>
}
