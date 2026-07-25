export default function Select({ label, error, options = [], placeholder, id, className = '', children, ...props }) {
  const selectId = id || props.name
  return (
    <div className={className}>
      {label && <label htmlFor={selectId} className="label">{label}</label>}
      <select
        id={selectId}
        className={`input ${error ? 'border-red-400' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
