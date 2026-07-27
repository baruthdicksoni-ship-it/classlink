import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Onyesho la tahadhari — orodha ya mambo yanayohitaji hatua
export default function AlertsPanel({ alerts = [] }) {
  const navigate = useNavigate()
  const active = alerts.filter((a) => a.count > 0)

  if (active.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-500">
            <AlertTriangle className="h-[18px] w-[18px]" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Hakuna tahadhari</p>
            <p className="text-sm text-slate-500">Kila kitu kiko sawa kwa sasa.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-slate-900">Tahadhari</h3>
        <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-100">
          {active.length}
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {active.map((a) => (
          <button
            key={a.label}
            onClick={() => a.to && navigate(a.to)}
            className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/70"
          >
            <div className={`shrink-0 rounded-lg p-1.5 ${a.tone === 'red' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
              <a.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{a.label}</p>
              <p className="text-xs text-slate-500">{a.hint}</p>
            </div>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${a.tone === 'red' ? 'text-red-600' : 'text-amber-600'}`}>
              {a.count}
            </span>
            {a.to && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
          </button>
        ))}
      </div>
    </div>
  )
}
