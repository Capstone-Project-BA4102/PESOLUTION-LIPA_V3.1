// @ts-nocheck
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Tone = 'brand' | 'success' | 'warning' | 'info' | 'neutral'

const tones: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-600',
  success: 'bg-success-100 text-success-600',
  warning: 'bg-warning-100 text-warning-600',
  info: 'bg-info-100 text-info-600',
  neutral: 'bg-slate-100 text-slate-600',
}

const sizes = {
  sm: 'h-8 w-8 [&>svg]:h-4 [&>svg]:w-4',
  md: 'h-10 w-10 [&>svg]:h-5 [&>svg]:w-5',
  lg: 'h-12 w-12 [&>svg]:h-6 [&>svg]:w-6',
}

/** Square tinted box holding an icon. Default tone is PESO red for consistency. */
export function IconBox({
  children,
  tone = 'brand',
  size = 'md',
  round,
  className,
}: {
  children: ReactNode
  tone?: Tone
  size?: keyof typeof sizes
  round?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        round ? 'rounded-full' : 'rounded-lg',
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  )
}
