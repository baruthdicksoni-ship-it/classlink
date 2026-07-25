export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function THead({ columns = [] }) {
  return (
    <thead className="bg-slate-50 text-left">
      <tr>
        {columns.map((c, i) => (
          <th
            key={i}
            className={`px-4 py-3 font-medium text-slate-600 whitespace-nowrap
                        border-b border-slate-200 ${c.align === 'right' ? 'text-right' : ''}`}
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
  return <tbody className="divide-y divide-slate-100">{children}</tbody>
}

export function TR({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer' : ''} hover:bg-slate-50/70 transition-colors ${className}`}
    >
      {children}
    </tr>
  )
}

export function TD({ children, align, className = '' }) {
  return (
    <td className={`px-4 py-3 text-slate-700 ${align === 'right' ? 'text-right' : ''} ${className}`}>
      {children}
    </td>
  )
}
