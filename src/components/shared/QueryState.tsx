import { Alert, Button } from '@/components/ui'
import { usePT } from '@/lib/portalCopy'

/**
 * Animated placeholder for first-load data. The label stays available to screen
 * readers while sighted users see the page shape fill in. Pass `kpis` to mirror
 * a studio list page (title, KPI strip, filter row, data table); otherwise a
 * generic card layout is used.
 */
export function LoadingBlock({
  label = 'Loading…',
  rows = 4,
  kpis = 0,
  action = false,
}: {
  label?: string
  rows?: number
  kpis?: number
  action?: boolean
}) {
  const pt = usePT()
  return (
    <div className="space-y-4 py-4" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{pt(label)}</span>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-md space-y-2">
          <div className="ui-skeleton h-6 w-2/5 rounded-md" />
          <div className="ui-skeleton h-3.5 w-full rounded-md" />
        </div>
        {action && <div className="ui-skeleton h-9 w-32 shrink-0 rounded-md" />}
      </div>
      {kpis > 0 ? (
        <>
          <div className={kpis >= 5 ? 'studio-kpis is-5' : 'studio-kpis'}>
            {Array.from({ length: kpis }, (_, index) => (
              <div key={index} className="studio-kpi is-static">
                <div className="ui-skeleton h-3 w-1/2" />
                <div className="ui-skeleton mt-2 h-6 w-16" />
                <div className="ui-skeleton mt-2 h-2.5 w-4/5" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="ui-skeleton h-9 min-w-[220px] flex-1 rounded-md" />
            <div className="ui-skeleton h-8 w-56 rounded-lg sm:w-72" />
            <div className="ui-skeleton h-8 w-14 rounded-md" />
          </div>
          <div className="studio-card">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="ui-skeleton h-4 w-4 shrink-0 rounded" />
              <div className="ui-skeleton h-2.5 w-24 rounded" />
              <div className="ui-skeleton ml-auto hidden h-2.5 w-20 rounded sm:block" />
              <div className="ui-skeleton hidden h-2.5 w-16 rounded sm:block" />
              <div className="ui-skeleton h-2.5 w-16 rounded" />
              <div className="w-7 shrink-0" />
            </div>
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className="flex items-center gap-3 border-b border-slate-200 px-3 py-2.5 last:border-b-0">
                <div className="ui-skeleton h-4 w-4 shrink-0 rounded" />
                <div className="ui-skeleton h-8 w-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="ui-skeleton h-3 w-2/5 rounded-md" />
                  <div className="ui-skeleton h-2.5 w-1/4 rounded-md" />
                </div>
                <div className="hidden flex-1 space-y-1.5 md:block">
                  <div className="ui-skeleton h-3 w-1/3 rounded-md" />
                  <div className="ui-skeleton h-2.5 w-1/5 rounded-md" />
                </div>
                <div className="ui-skeleton h-5 w-20 shrink-0 rounded-md" />
                <div className="ui-skeleton h-7 w-7 shrink-0 rounded-md" />
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="ui-skeleton h-3 w-32 rounded" />
              <div className="ui-skeleton h-7 w-24 rounded-md" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="ui-skeleton h-9 w-40 flex-1 rounded-md" />
              <div className="ui-skeleton h-9 w-28 rounded-md" />
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className="flex items-center gap-3 py-1">
                <div className="ui-skeleton h-9 w-9 shrink-0 rounded-full" />
                <div className="ui-skeleton h-3 flex-1 rounded-md" />
                <div className="ui-skeleton hidden h-3 w-24 rounded-md sm:block" />
                <div className="ui-skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </>
      )}
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
