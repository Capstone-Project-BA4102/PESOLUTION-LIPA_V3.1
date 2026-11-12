// @ts-nocheck
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePTNode } from '@/lib/portalCopy'

type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const styles: Record<AlertTone, { box: string; icon: ReactNode; title: string }> = {
  info: { box: 'border-info-100 bg-info-50 text-info-700', icon: <Info />, title: 'text-info-700' },
  success: { box: 'border-success-100 bg-success-50 text-success-700', icon: <CheckCircle2 />, title: 'text-success-700' },
  warning: { box: 'border-warning-100 bg-warning-50 text-warning-700', icon: <AlertTriangle />, title: 'text-warning-700' },
  danger: { box: 'border-brand-200 bg-brand-50 text-brand-800', icon: <XCircle />, title: 'text-brand-800' },
}

/** Consistent alert / notice box. */
export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const s = styles[tone]
  const ptNode = usePTNode()
  return (
    <div role="status" className={cn('flex flex-wrap items-start gap-3 rounded-card border p-4', s.box, className)}>
      <span className="mt-0.5 shrink-0 [&>svg]:h-6 [&>svg]:w-6">{s.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className={cn('font-bold', s.title)}>{ptNode(title)}</p>}
        {children && <div className={cn(title ? 'mt-0.5' : '')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
