import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'
import { useDialog } from './useDialog'
import { usePTNode } from '@/lib/portalCopy'
import './Drawer.css'

/** Detailed record view that leaves the list full-width until opened. */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  const panel = useRef<HTMLElement>(null)
  const titleId = useId()
  const ptNode = usePTNode()
  useDialog(open, panel, onClose)
  if (!open) return null
  return createPortal(<div className="no-print fixed inset-0 z-50 bg-ink/40" onClick={onClose}>
    <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
      className="ui-record-drawer absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-lg"
      onClick={event => event.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <h2 id={titleId} className="text-[16px] font-semibold">{ptNode(title)}</h2>
        <IconButton label="Close" onClick={onClose}><X /></IconButton>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  </div>, document.body)
}
