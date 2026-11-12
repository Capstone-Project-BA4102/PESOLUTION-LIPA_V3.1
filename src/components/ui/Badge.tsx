import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tone } from './IconBox'
import { usePTNode } from '@/lib/portalCopy'

const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-success-50 text-success-700 ring-success-100',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100',
  info: 'bg-info-50 text-info-700 ring-info-100',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
}

/** Small pill label. `wrap` lets long labels break onto two lines instead of forcing nowrap. */
export function Badge({ tone = 'neutral', children, className, wrap }: { tone?: Tone; children: ReactNode; className?: string; wrap?: boolean }) {
  const ptNode = usePTNode()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[0.9rem] font-semibold ring-1 ring-inset',
        wrap ? 'whitespace-normal text-center leading-snug' : 'whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {ptNode(children)}
    </span>
  )
}

/** Maps every status word used in the system to ONE consistent color. */
const STATUS_TONE: Record<string, Tone> = {
  Active: 'success',
  Matched: 'success',
  Qualified: 'success',
  Completed: 'success',
  Referred: 'success',
  'Referral Confirmed': 'success',
  Hired: 'success',
  Shortlisted: 'warning',
  Pending: 'warning',
  Declined: 'warning',
  'Needs Skill Development': 'warning',
  'For Referral': 'info',
  'Ready to Issue': 'info',
  'Referral Requested': 'info',
  Inactive: 'neutral',
  Closed: 'neutral',
  New: 'brand',
  Renewal: 'brand',
}

export function StatusBadge({ status, className, wrap }: { status: string; className?: string; wrap?: boolean }) {
  const ptNode = usePTNode()
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} className={className} wrap={wrap}>
      {ptNode(status)}
    </Badge>
  )
}

/** Skill chip. Hard skills use blue; soft skills use green across the system. */
export function SkillTag({
  children,
  variant = 'default',
  onRemove,
}: {
  children: ReactNode
  variant?: 'default' | 'brand' | 'hard' | 'soft' | 'matched' | 'gap'
  onRemove?: () => void
}) {
  const v = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    hard: 'bg-info-50 text-info-700 border-info-100',
    soft: 'bg-success-50 text-success-700 border-success-100',
    matched: 'bg-success-50 text-success-700 border-success-100',
    gap: 'bg-warning-50 text-warning-700 border-warning-100',
  }[variant]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[0.95rem] font-medium', v)}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove" className="rounded hover:bg-black/5">
          <X className="h-4 w-4" />
        </button>
      )}
    </span>
  )
}
