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
      '-mb-px inline-flex items-center gap-1.5 border-b-2 px-0.5 pb-2 pt-0.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors [&>svg]:h-4 [&>svg]:w-4',
      isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900',
    )
  return (
    <div role={items.every(item => item.to) ? "navigation" : "tablist"} className={cn('flex gap-4 overflow-x-auto overflow-y-hidden border-b border-slate-200', className)}>
      {items.map((t) =>
        t.to ? (
          <NavLink key={t.key} to={t.to} end className={({ isActive }) => cls(isActive)}>
            {t.icon}
            {ptNode(t.label)}
          </NavLink>
        ) : (
          <button type="button" key={t.key} tabIndex={(active || items[0]?.key) === t.key ? 0 : -1} onKeyDown={event => { const keys = items.filter(item => !item.to); const index = keys.findIndex(item => item.key === t.key); const next = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : event.key === 'ArrowRight' ? (index + 1) % keys.length : event.key === 'ArrowLeft' ? (index - 1 + keys.length) % keys.length : -1; if (next < 0) return; event.preventDefault(); onChange?.(keys[next].key); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus() }} role="tab" aria-selected={active === t.key} onClick={() => onChange?.(t.key)} className={cls(active === t.key)}>
            {t.icon}
            {ptNode(t.label)}
          </button>
        ),
      )}
    </div>
  )
}
