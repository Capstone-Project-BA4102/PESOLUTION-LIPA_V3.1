// @ts-nocheck
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Home } from 'lucide-react'
import { usePTNode } from '@/lib/portalCopy'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  const ptNode = usePTNode()
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-slate-600">
      <Link to="/" className="text-brand-700 hover:underline" aria-label="Home">
        <Home className="h-5 w-5" />
      </Link>
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-4 w-4 text-slate-400" />
          {c.to ? (
            <Link to={c.to} className="text-brand-700 hover:underline">
              {ptNode(c.label)}
            </Link>
          ) : (
            <span className="font-medium text-slate-800">{ptNode(c.label)}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  const ptNode = usePTNode()
  return (
    <Link to={to} className="mb-3 inline-flex items-center gap-2 font-semibold text-brand-700 hover:underline">
      <ArrowLeft className="h-5 w-5" />
      {ptNode(children)}
    </Link>
  )
}

/**
 * Standard page title block used on EVERY page:
 * [breadcrumb | back link]  ->  Title + description (left)  /  actions (right)
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  back,
  badge,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  breadcrumb?: Crumb[]
  back?: { to: string; label: string }
  badge?: ReactNode
}) {
  const ptNode = usePTNode()
  return (
    <div>
      {breadcrumb && <Breadcrumb items={breadcrumb} />}
      {back && <BackLink to={back.to}>{back.label}</BackLink>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold md:text-[2.1rem]">{ptNode(title)}</h1>
            {badge}
          </div>
          {description && <p className="mt-1.5 max-w-3xl text-lg text-slate-600">{ptNode(description)}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  )
}
