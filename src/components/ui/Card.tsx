import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { IconBox } from './IconBox'
import { usePTNode } from '@/lib/portalCopy'

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-card border border-slate-200 bg-white shadow-sm', className)} {...rest}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
  /** Show a divider under the header */
  divider?: boolean
}

/** Standard card header: optional red icon box, title, description and right-side action. */
export function CardHeader({ title, description, icon, action, className, divider }: CardHeaderProps) {
  const ptNode = usePTNode()
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 px-6 pt-6',
        divider ? 'border-b border-slate-200 pb-4' : 'pb-2',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && <IconBox>{icon}</IconBox>}
        <div className="min-w-0">
          <h2 className="text-xl font-bold">{ptNode(title)}</h2>
          {description && <p className="mt-0.5 text-slate-600">{ptNode(description)}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4', className)}
      {...rest}
    >
      {children}
    </div>
  )
}
