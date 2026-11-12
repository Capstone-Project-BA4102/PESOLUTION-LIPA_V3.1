import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePTNode } from '@/lib/portalCopy'

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
  size?: 'md' | 'lg' | 'xl'
  /** Set false for a dialog the user must act on, e.g. the first-sign-in password prompt. */
  dismissible?: boolean
}) {
  const ptNode = usePTNode()
  useEffect(() => {
    if (!open || !dismissible) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, dismissible])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4" onClick={dismissible ? onClose : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-card bg-white shadow-xl',
          size === 'xl' ? 'max-w-6xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-bold">{ptNode(title)}</h2>
          {dismissible && (
            <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}
