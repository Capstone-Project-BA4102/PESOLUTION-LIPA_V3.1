// @ts-nocheck
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { usePTNode } from '@/lib/portalCopy'

export interface TabItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  /** If provided, the tab is a route link instead of a button. */
  to?: string
}

/** Underline-style tabs. Use `to` for route tabs or `active/onChange` for local state. */
export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[]
  active?: string
  onChange?: (key: string) => void
  className?: string
}) {
  const ptNode = usePTNode()
  const cls = (isActive: boolean) =>
    cn(
      '-mb-px inline-flex items-center gap-2 border-b-[3px] px-1 pb-3 pt-1 text-[1.05rem] font-semibold whitespace-nowrap transition-colors [&>svg]:h-5 [&>svg]:w-5',
      isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900',
    )
  return (
    <div role="tablist" className={cn('flex gap-8 overflow-x-auto border-b border-slate-200', className)}>
      {items.map((t) =>
        t.to ? (
          <NavLink key={t.key} to={t.to} end className={({ isActive }) => cls(isActive)}>
            {t.icon}
            {ptNode(t.label)}
          </NavLink>
        ) : (
          <button key={t.key} role="tab" aria-selected={active === t.key} onClick={() => onChange?.(t.key)} className={cls(active === t.key)}>
            {t.icon}
            {t.label}
          </button>
        ),
      )}
    </div>
  )
}
