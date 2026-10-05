import { Loader2 } from 'lucide-react'
import { mix } from '../lib/imageUtils.js'

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function Button({ children, variant = 'primary', size = 'md', className, loading, icon: Icon, ...props }) {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm disabled:bg-slate-300',
    dark: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm disabled:bg-slate-300',
    soft: 'bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:text-slate-400',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  }
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}

export function Card({ children, className, ...props }) {
  return (
    <div className={cx('card p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function SectionTitle({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

export function Chip({ active, children, className, ...props }) {
  return (
    <button
      className={cx(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Segmented({ value, onChange, options, className }) {
  return (
    <div className={cx('inline-flex rounded-xl bg-slate-100 p-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cx(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            value === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-indigo-600' : 'bg-slate-300',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
            checked ? 'left-4.5' : 'left-0.5',
          )}
        />
      </button>
      <span className="text-xs leading-relaxed">
        <span className="font-medium text-slate-700">{label}</span>
        {hint ? <span className="block text-slate-500">{hint}</span> : null}
      </span>
    </label>
  )
}

export function Alert({ tone = 'info', title, children, onClose }) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }
  return (
    <div className={cx('rounded-xl border p-3.5 text-xs leading-relaxed', tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {title ? <p className="mb-1 font-semibold">{title}</p> : null}
          <div>{children}</div>
        </div>
        {onClose ? (
          <button onClick={onClose} className="shrink-0 rounded-md px-1.5 text-base leading-none opacity-60 hover:opacity-100">
            ×
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Ilustrasi kecil pakaian (jaket + kemeja + dasi) untuk kartu pilihan. */
export function GarmentThumb({ garment, className }) {
  const { jacket, shirt, tie, accent, pattern } = garment.colors
  const lapel = mix(jacket, accent || '#000000', 0.55)
  return (
    <svg viewBox="0 0 80 64" className={className} aria-hidden="true">
      <rect width="80" height="64" rx="6" fill="#f8fafc" />
      <path d="M6 64V27C6 14 19 5 30 5h20c11 0 24 9 24 22v37z" fill={jacket} />
      {pattern === 'batik' ? (
        <g opacity="0.28" fill="#ffffff">
          {[...Array(6)].map((_, row) =>
            [...Array(8)].map((__, col) => (
              <circle key={`${row}-${col}`} cx={10 + col * 9} cy={26 + row * 7} r="1.6" />
            )),
          )}
        </g>
      ) : null}
      <path d="M40 6 30 30l10 34 10-34z" fill={shirt} />
      {tie ? <path d="M40 12 34.5 22 40 58l5.5-36z" fill={tie} /> : null}
      <path d="M30 6 40 32 26 20z" fill={lapel} />
      <path d="M50 6 40 32 54 20z" fill={lapel} />
    </svg>
  )
}
