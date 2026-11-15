import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDialog } from './useDialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePT, usePTNode } from '@/lib/portalCopy'

/** Simple accessible modal dialog. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Set false for a dialog the user must act on, e.g. the first-sign-in password prompt. */
  dismissible?: boolean
}) {
  const ptNode = usePTNode()
  const pt = usePT()
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  useDialog(open, panel, onClose, dismissible)

  if (!open) return null
  return createPortal(
    <div className="ui-backdrop no-print fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4" onClick={dismissible ? onClose : undefined}>
      <div
        ref={panel}
        role="dialog"
        tabIndex={-1}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          'ui-dialog flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-xl',
          size === 'sm' ? 'max-w-[440px]' : size === 'xl' ? 'max-w-6xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <h2 id={titleId} className="text-[16px] font-semibold">{ptNode(title)}</h2>
          {dismissible && (
            <button type="button" onClick={onClose} className="ui-icon-button flex items-center justify-center rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label={pt('Close')}>
              <X className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3">{footer}</div>}
      </div>
    </div>, document.body
  )
}
