import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { usePT } from '@/lib/portalCopy'

/** Icon-only actions always have a translated accessible name and a native tooltip. */
export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  const pt = usePT()
  return <button type="button" aria-label={pt(label)} title={pt(label)} className={cn('ui-icon-button inline-flex shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:h-[18px] [&>svg]:w-[18px]', className)} {...rest}>{children}</button>
}
