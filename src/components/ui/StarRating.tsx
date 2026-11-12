import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared 5-star display. Supports fractional values (e.g. 4.5 fills the last
 * star halfway). Interactive mode turns the stars into a radiogroup picker.
 */
export function StarRating({
  value,
  size = 'md',
  showValue = false,
  onChange,
  className,
}: {
  value: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  onChange?: (v: number) => void
  className?: string
}) {
  const uid = useId().replace(/:/g, '')
  const px = { sm: 'h-4 w-4', md: 'h-7 w-7', lg: 'h-9 w-9' }[size]

  const glyph = (i: number, filled: boolean) => {
    const pct = filled ? Math.max(0, Math.min(1, value - (i - 1))) * 100 : 0
    const gid = `sr-${uid}-${i}`
    return (
      <svg
        viewBox="0 0 24 24"
        className={cn(px, filled ? 'star-gold' : 'star-empty')}
        fill={`url(#${gid})`}
        stroke="currentColor"
        strokeWidth={1.2}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
            <stop offset={`${pct}%`} stopColor="var(--color-warning-500)" />
            <stop offset={`${pct}%`} stopColor="transparent" />
          </linearGradient>
        </defs>
        <polygon points="12 2.5 14.9 8.6 21.5 9.5 16.7 14.1 17.9 20.7 12 17.5 6.1 20.7 7.3 14.1 2.5 9.5 9.1 8.6" />
      </svg>
    )
  }

  if (onChange) {
    return (
      <div className={cn('flex gap-2', className)} role="radiogroup" aria-label="Overall rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i === 1 ? '' : 's'}`}
            className="rounded transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {glyph(i, value >= i)}
          </button>
        ))}
      </div>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i}>{glyph(i, value >= i)}</span>
      ))}
      {showValue && <span className="ml-1 font-bold text-slate-700">{value > 0 ? value.toFixed(1) : '—'}</span>}
    </span>
  )
}
