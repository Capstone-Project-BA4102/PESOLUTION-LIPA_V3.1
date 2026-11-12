import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * The ONE brand lock-up used everywhere: official Lipa City seal + "PESO LIPA / PESOLUTION".
 * `variant="light"` is for red backgrounds (portal header), `dark` for white backgrounds.
 */
export function Logo({ variant = 'dark', to = '/', className }: { variant?: 'light' | 'dark'; to?: string; className?: string }) {
  const light = variant === 'light'
  return (
    <Link to={to} className={cn('flex min-w-0 items-center gap-2 sm:gap-3', className)} aria-label="PESOLUTION – PESO Lipa City home">
      <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white', light && 'ring-2 ring-white/60')}>
        <img src="/logo-lipa.png" alt="City of Lipa official seal" className="h-11 w-11 object-contain" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className={cn('block text-xs font-bold sm:text-[0.85rem]', light ? 'text-white/90' : 'text-slate-700')}>PESO LIPA CITY</span>
        <span className={cn('block text-xl font-bold sm:text-2xl', light ? 'text-white' : 'text-brand-600')}>PESOLUTION</span>
      </span>
    </Link>
  )
}
