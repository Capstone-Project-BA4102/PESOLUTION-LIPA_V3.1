import { Loader2 } from 'lucide-react'
import { Alert, Button } from '@/components/ui'
import { usePT } from '@/lib/portalCopy'

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  const pt = usePT()
  return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {pt(label)}
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 py-6">
      <Alert tone="danger">{message}</Alert>
      {onRetry && (
        <Button variant="neutral" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
