export function Table({ children, className = '', minWidth = '640px' }) {
  return (
    <div className={`-mx-px overflow-x-auto ${className}`}>
      <table className="w-full text-sm" style={{ minWidth }}>{children}</table>
    </div>
  )
}

export function THead({ columns = [] }) {
  return (
    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
      <tr>
        {columns.map((c, i) => (
          <th
            key={i}
            className={`px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider
                        text-slate-500 whitespace-nowrap border-b border-slate-200 sm:px-6
                        ${c.align === 'right' ? 'text-right' : ''}
                        ${c.hideOnMobile ? 'hidden md:table-cell' : ''}`}
            style={c.width ? { width: c.width } : undefined}
          >
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-slate-50">{children}</tbody>
}

export function TR({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer' : ''} transition-colors even:bg-slate-50/40 hover:bg-brand-50/50 ${className}`}
    >
      {children}
    </tr>
  )
}

export function TD({ children, align, className = '', hideOnMobile = false }) {
  return (
    <td className={`px-4 py-4 text-slate-600 sm:px-6 ${align === 'right' ? 'text-right' : ''} ${hideOnMobile ? 'hidden md:table-cell' : ''} ${className}`}>
      {children}
    </td>
  )
}
