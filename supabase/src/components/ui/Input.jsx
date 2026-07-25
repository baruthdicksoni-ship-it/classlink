export default function Input({ label, error, hint, id, className = '', ...props }) {
  const inputId = id || props.name
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <input
        id={inputId}
        className={`input ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
