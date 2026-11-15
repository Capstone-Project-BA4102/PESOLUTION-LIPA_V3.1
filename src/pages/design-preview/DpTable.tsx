import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

export interface DpCol<T> {
  key: string
  label: string
  width?: number | string
  render: (row: T) => ReactNode
}

export interface DpRowAction<T> {
  label: string
  icon?: ReactNode
  danger?: boolean
  run: (row: T) => void
}

export interface DpBulkAction<T> {
  label: string
  icon?: ReactNode
  danger?: boolean
  run: (rows: T[]) => void
}

/**
 * THE table used by every CRUD screen in the proposal: identical header, row
 * height, borders, checkbox selection, bulk bar, row menu, and footer pager.
 */
export default function DpTable<T extends { id: string }>({
  columns,
  rows,
  selectable = true,
  activeId,
  onRowClick,
  bulkActions = [],
  rowActions = [],
  footer,
  minWidth,
}: {
  columns: DpCol<T>[]
  rows: T[]
  selectable?: boolean
  activeId?: string
  onRowClick?: (row: T) => void
  bulkActions?: DpBulkAction<T>[]
  rowActions?: DpRowAction<T>[]
  footer?: ReactNode
  minWidth?: number
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const headRef = useRef<HTMLInputElement>(null)
  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id))
  const someChecked = !allChecked && rows.some(r => selected.has(r.id))

  useEffect(() => {
    if (headRef.current) headRef.current.indeterminate = someChecked
  }, [someChecked])

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map(r => r.id)))
  const bulkRows = rows.filter(r => selected.has(r.id))
  const colCount = columns.length + (selectable ? 1 : 0) + (rowActions.length ? 1 : 0)

  return (
    <div>
      {selected.size > 0 && bulkActions.length > 0 && (
        <div className="dp-bulkbar" role="status">
          <b>{selected.size} selected</b>
          <span className="sep" />
          {bulkActions.map(a => (
            <button
              key={a.label}
              type="button"
              className={`dp-btn sm ${a.danger ? 'neutral' : 'soft'}`}
              onClick={() => { a.run(bulkRows); setSelected(new Set()) }}
            >
              {a.icon}{a.label}
            </button>
          ))}
          <span className="spacer" />
          <button type="button" className="dp-btn ghost sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      <div className="dp-table-wrap">
        <table className="dp-table" style={minWidth ? { minWidth } : undefined}>
          <thead>
            <tr>
              {selectable && (
                <th className="dp-th-check">
                  <input ref={headRef} type="checkbox" className="dp-check" checked={allChecked} onChange={toggleAll} aria-label="Select all rows" />
                </th>
              )}
              {columns.map(c => <th key={c.key} style={{ width: c.width }}>{c.label}</th>)}
              {rowActions.length > 0 && <th style={{ width: 48 }} aria-label="Row actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.id}
                className={activeId === row.id ? 'sel' : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable && (
                  <td className="dp-td-check" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="dp-check"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Select ${row.id}`}
                    />
                  </td>
                )}
                {columns.map(c => <td key={c.key}>{c.render(row)}</td>)}
                {rowActions.length > 0 && (
                  <td onClick={e => e.stopPropagation()}>
                    <details className="dp-menu">
                      <summary><span className="dp-iconbtn" aria-label={`Actions for ${row.id}`}><MoreHorizontal style={{ width: 15, height: 15 }} /></span></summary>
                      <div className="dp-menu-panel">
                        {rowActions.map(a => (
                          <button
                            key={a.label}
                            type="button"
                            className={a.danger ? 'danger' : undefined}
                            onClick={e => {
                              const details = (e.currentTarget.closest('details') as HTMLDetailsElement | null)
                              if (details) details.open = false
                              a.run(row)
                            }}
                          >
                            {a.icon}{a.label}
                          </button>
                        ))}
                      </div>
                    </details>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={colCount}><div className="dp-empty">No records. Adjust the filters or add a new record.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="dp-tablefoot">
        <span>{selected.size > 0 ? `${selected.size} of ${rows.length} selected` : footer ?? `${rows.length} rows`}</span>
        <div className="pager">
          <button type="button" className="dp-btn neutral sm" disabled>‹</button>
          <button type="button" className="dp-btn neutral sm">1</button>
          <button type="button" className="dp-btn ghost sm">2</button>
          <button type="button" className="dp-btn ghost sm">3</button>
          <button type="button" className="dp-btn ghost sm">›</button>
        </div>
      </div>
    </div>
  )
}
