import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm',
  ghost:     'text-slate-600 hover:bg-slate-100',
  danger:    'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  subtle:    'bg-brand-50 text-brand-700 hover:bg-brand-100'
}

const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2',
  icon: 'h-9 w-9'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-medium
                  transition-colors disabled:opacity-50 disabled:pointer-events-none
                  ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
}
