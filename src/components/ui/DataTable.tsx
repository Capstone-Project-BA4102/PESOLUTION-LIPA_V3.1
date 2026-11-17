import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { usePT } from '@/lib/portalCopy'

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  width?: number | string
  render: (row: T) => ReactNode
}

export interface DataTableBulkAction<T> {
  label: string
  icon?: ReactNode
  danger?: boolean
  run: (rows: T[]) => void
}

export interface DataTableRowAction<T> {
  /** Static label, or a per-row label for actions whose wording depends on the record. */
  label: string | ((row: T) => string)
  icon?: ReactNode | ((row: T) => ReactNode)
  danger?: boolean
  run: (row: T) => void
}

export interface DataTablePagination {
  from: number
  to: number
  total: number
  page: number
  pages: number
  /** i18n key for the record noun, e.g. "applicants". */
  label: string
  onPage: (page: number) => void
}

/** Page numbers with gaps when there are more than seven pages. */
function pageItems(page: number, pages: number): Array<number | 'gap'> {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1)
  const start = Math.max(2, Math.min(page - 1, pages - 3))
  const end = Math.min(pages - 1, Math.max(page + 1, 4))
  const items: Array<number | 'gap'> = [1]
  if (start > 2) items.push('gap')
  for (let value = start; value <= end; value += 1) items.push(value)
  if (end < pages - 1) items.push('gap')
  items.push(pages)
  return items
}

/**
 * The single table used by every workspace screen: identical header, row
 * height, borders, checkbox selection, bulk bar, row menu and pager.
 */
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  selectable = true,
  activeId,
  onRowClick,
  bulkActions = [],
  rowActions = [],
  pagination,
  empty,
  minWidth,
}: {
  rows: T[]
  columns: DataTableColumn<T>[]
  selectable?: boolean
  activeId?: string
  onRowClick?: (row: T) => void
  bulkActions?: DataTableBulkAction<T>[]
  rowActions?: DataTableRowAction<T>[]
  pagination?: DataTablePagination
  empty?: ReactNode
  minWidth?: number
}) {
  const pt = usePT()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const headRef = useRef<HTMLInputElement>(null)
  const allChecked = rows.length > 0 && rows.every(row => selected.has(row.id))
  const someChecked = !allChecked && rows.some(row => selected.has(row.id))
  const selectedRows = rows.filter(row => selected.has(row.id))
  const columnCount = columns.length + (selectable ? 1 : 0) + (rowActions.length ? 1 : 0)

  useEffect(() => {
    if (headRef.current) headRef.current.indeterminate = someChecked
  }, [someChecked])

  const toggle = (id: string) => setSelected(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  return (
    <div>
      {selected.size > 0 && bulkActions.length > 0 && (
        <div className="studio-bulkbar" role="status">
          <b>{selected.size} {pt('selected')}</b>
          <span className="sep" />
          {bulkActions.map(action => (
            <button
              key={action.label}
              type="button"
              className="studio-bulk-action"
              onClick={() => {
                action.run(selectedRows)
                setSelected(new Set())
              }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
          <span className="spacer" />
          <button type="button" className="text-[12px] font-semibold underline-offset-2 hover:underline" onClick={() => setSelected(new Set())}>
            {pt('Clear')}
          </button>
        </div>
      )}

      <div className="studio-table-wrap">
        <table className="studio-table" style={minWidth ? { minWidth } : undefined}>
          <thead>
            <tr>
              {selectable && (
                <th className="studio-th-check">
                  <input
                    ref={headRef}
                    type="checkbox"
                    className="studio-check"
                    checked={allChecked}
                    onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map(row => row.id)))}
                    aria-label={pt('Select all rows')}
                  />
                </th>
              )}
              {columns.map(column => (
                <th key={column.key} style={{ width: column.width }}>{column.header}</th>
              ))}
              {rowActions.length > 0 && <th style={{ width: 48 }} aria-label={pt('Row actions')} />}
            </tr>
          </thead>
          <tbody key={pagination?.page ?? 1} className="ui-page-enter">
            {rows.map(row => (
              <tr
                key={row.id}
                className={activeId === row.id ? 'is-active' : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable && (
                  <td className="studio-td-check" onClick={event => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="studio-check"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={pt('Select row')}
                    />
                  </td>
                )}
                {columns.map(column => <td key={column.key}>{column.render(row)}</td>)}
                {rowActions.length > 0 && (
                  <td onClick={event => event.stopPropagation()}>
                    <details className="studio-menu">
                      <summary>
                        <span className="studio-iconbtn" aria-label={pt('Row actions')}>
                          <MoreHorizontal className="h-4 w-4" />
                        </span>
                      </summary>
                      <div className="studio-menu-panel">
                        {rowActions.map((action, index) => {
                          const label = typeof action.label === 'function' ? action.label(row) : action.label
                          const icon = typeof action.icon === 'function' ? action.icon(row) : action.icon
                          return (
                            <button
                              key={`${index}-${label}`}
                              type="button"
                              className={action.danger ? 'danger' : undefined}
                              onClick={event => {
                                const details = event.currentTarget.closest('details') as HTMLDetailsElement | null
                                if (details) details.open = false
                                action.run(row)
                              }}
                            >
                              {icon}
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </details>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columnCount}>
                  <div className="studio-empty">{empty ?? pt('No records found.')}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="studio-tablefoot">
          <p>
            {pt('Showing')} <b>{pagination.from}</b> {pt('to')} <b>{pagination.to}</b> {pt('of')}{' '}
            <b>{pagination.total}</b> {pt(pagination.label)}
          </p>
          <nav className="studio-pager" aria-label={pt('Pagination')}>
            <button
              type="button"
              className="studio-page-btn"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPage(Math.max(1, pagination.page - 1))}
              aria-label={pt('Previous page')}
            >
              ‹
            </button>
            {pageItems(pagination.page, pagination.pages).map((item, index) => (
              item === 'gap'
                ? <span key={`gap-${index}`} className="px-1 text-slate-400">…</span>
                : (
                  <button
                    key={item}
                    type="button"
                    className={`studio-page-btn ${item === pagination.page ? 'is-on' : ''}`}
                    aria-current={item === pagination.page ? 'page' : undefined}
                    onClick={() => pagination.onPage(item)}
                  >
                    {item}
                  </button>
                )
            ))}
            <button
              type="button"
              className="studio-page-btn"
              disabled={pagination.page >= pagination.pages}
              onClick={() => pagination.onPage(Math.min(pagination.pages, pagination.page + 1))}
              aria-label={pt('Next page')}
            >
              ›
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}
