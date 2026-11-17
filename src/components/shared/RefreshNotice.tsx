import { Button } from '@/components/ui/Button'
import { usePT } from '@/lib/portalCopy'
export function RefreshNotice({ error, retry }: { error: string | null; refreshing: boolean; retry: () => void }) {
  const pt = usePT()
  if (error) return <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning-100 bg-warning-50 p-3 text-sm text-warning-700">
    <span>{pt('Showing saved data. Refresh failed.')} {error}</span><Button size="sm" variant="neutral" onClick={retry}>{pt('Retry')}</Button>
  </div>
  return null
}
