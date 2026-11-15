// @ts-nocheck
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePT, usePTNode } from '@/lib/portalCopy'

/** Horizontally scrollable table wrapper (works on mobile). noScroll clips instead, for fixed-layout tables. */
export function Table({ className, children, noScroll, ...rest }: HTMLAttributes<HTMLTableElement> & { noScroll?: boolean }) {
  return (
    <div className={cn('w-full', noScroll ? 'overflow-hidden' : 'overflow-x-auto')}>
      <table className={cn('w-full min-w-full border-collapse text-left text-[14px]', className)} {...rest}>
        {children}
      </table>
    </div>
  )
}

export function THead({ className, children, ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-slate-200 bg-slate-50/80', className)} {...rest}>{children}</thead>
}

export function TH({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  const ptNode = usePTNode()
  return (
    <th className={cn('px-4 py-2 text-[13px] font-semibold first:pl-6 last:pr-6 text-slate-500', className)} {...rest}>
      {ptNode(children)}
    </th>
  )
}

export function TR({ className, selected, children, ...rest }: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      className={cn('border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70', selected && 'bg-brand-50 hover:bg-brand-50', className)}
      {...rest}
    >
      {children}
    </tr>
  )
}

export function TD({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-2 align-middle first:pl-6 last:pr-6 text-slate-700', className)} {...rest}>
      {children}
    </td>
  )
}

/** "Showing 1 to 10 of 328 applicants" + page buttons. */
export function Pagination({
  from,
  to,
  total,
  label,
  page = 1,
  pages = 1,
  onPage,
}: {
  from: number
  to: number
  total: number
  label: string
  page?: number
  pages?: number
  onPage?: (p: number) => void
}) {
  const pt = usePT()
  const shown = Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1)
  const btn = 'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[13px] font-semibold transition-colors'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[13px]">
      <p className="text-slate-500">
        {pt('Showing')} <b className="font-semibold text-slate-800">{from}</b> {pt('to')} <b className="font-semibold text-slate-800">{to}</b> {pt('of')}{' '}
        <b className="font-semibold text-slate-800">{total}</b> {pt(label)}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button className={cn(btn, 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100')} aria-label={pt('Previous page')} onClick={() => onPage?.(Math.max(1, page - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {shown.map((p) => (
          <button
            key={p}
            onClick={() => onPage?.(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(btn, p === page ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100')}
          >
            {p}
          </button>
        ))}
        {pages > 5 && (
          <>
            <span className="px-1 text-slate-400">…</span>
            <button onClick={() => onPage?.(pages)} className={cn(btn, 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100')}>
              {pages}
            </button>
          </>
        )}
        <button className={cn(btn, 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100')} aria-label={pt('Next page')} onClick={() => onPage?.(Math.min(pages, page + 1))}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  )
}






