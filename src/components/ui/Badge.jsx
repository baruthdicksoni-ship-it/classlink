const tones = {
  blue:   'bg-brand-50 text-brand-700 ring-brand-100',
  green:  'bg-emerald-50 text-emerald-700 ring-emerald-100',
  red:    'bg-red-50 text-red-700 ring-red-100',
  amber:  'bg-amber-50 text-amber-700 ring-amber-100',
  slate:  'bg-slate-100 text-slate-600 ring-slate-200/60'
}

export default function Badge({ tone = 'slate', children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs
                      font-medium ring-1 ring-inset ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
