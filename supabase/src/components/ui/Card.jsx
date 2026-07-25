export function Card({ className = '', children }) {
  return <div className={`card ${className}`}>{children}</div>
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 ${className}`}>
      <div className="min-w-0">
        <h3 className="font-semibold text-slate-900 truncate">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className = '', children }) {
  return <div className={`p-6 ${className}`}>{children}</div>
}
