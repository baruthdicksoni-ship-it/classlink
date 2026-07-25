export default function StatCard({ label, value, icon: Icon, tone = 'blue', hint }) {
  const tones = {
    blue:   'bg-brand-50 text-brand-500',
    green:  'bg-emerald-50 text-emerald-500',
    amber:  'bg-amber-50 text-amber-500',
    red:    'bg-red-50 text-red-500',
    slate:  'bg-slate-100 text-slate-400'
  }
  return (
    <div className="card group p-5 transition-all hover:border-slate-300/80 hover:shadow-md hover:shadow-slate-200/50">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <div className={`shrink-0 rounded-xl p-2 transition-transform group-hover:scale-105 ${tones[tone]}`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
