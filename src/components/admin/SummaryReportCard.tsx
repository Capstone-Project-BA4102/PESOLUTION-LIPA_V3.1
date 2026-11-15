import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Info, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { usePT } from '@/lib/portalCopy'
import { cn } from '@/lib/utils'
import { fetchSummaryReport, type ReportPeriod } from '@/lib/api'
import { downloadSummaryReportPdf } from '@/lib/summaryReportPdf'

const PERIODS: ReportPeriod[] = ['weekly', 'monthly']

/** Same window fetchSummaryReport uses, so the label always matches the downloaded PDF. */
function periodLabel(period: ReportPeriod, offset: number): string {
  const now = new Date()
  if (period === 'weekly') {
    const from = new Date(now)
    from.setDate(from.getDate() - 6 - 7 * offset)
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 6)
    const end = to > now ? now : to
    const fmt = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(from)} – ${fmt(end)}, ${end.getFullYear()}`
  }
  const from = new Date(now.getFullYear(), now.getMonth() - offset, 1)
  return from.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function NavButton({
  dir,
  onClick,
  disabled,
  label,
}: {
  dir: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function SummaryReportCard() {
  const pt=usePT()
  const [period,setPeriod]=useState<ReportPeriod>('weekly')
  const [offset,setOffset]=useState(0)
  const [exporting,setExporting]=useState(false)
  const [error,setError]=useState('')
  const locked=useRef(false)
  const changePeriod=(value: ReportPeriod)=>{setPeriod(value);setOffset(0);setError('')}
  const download=async()=>{
    if(locked.current)return
    locked.current=true;setExporting(true);setError('')
    const toastId=toast.loading(pt('Preparing PDF…'))
    try{
      const snapshot=await fetchSummaryReport(period,offset)
      const pages=await downloadSummaryReportPdf(snapshot,period,offset)
      toast.success(pt('Report PDF downloaded ({count} pages).',{count:pages}),{id:toastId})
    }catch(failure){
      const message=failure instanceof Error?failure.message:pt('Failed to generate the PDF.')
      setError(message);toast.error(message,{id:toastId})
    }finally{locked.current=false;setExporting(false)}
  }
  return (
    <section aria-label={pt('Report download')} className="studio-card p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700" aria-hidden="true">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-slate-900">{pt('Summary report')}</h2>
            <p className="mt-0.5 max-w-xl text-[12.5px] leading-5 text-slate-500">{pt('Weekly or monthly PDF of registrations, referrals, hires and placements.')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={pt('Report period')} className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {PERIODS.map(value => <button key={value} type="button" aria-pressed={period === value} disabled={exporting}
              onClick={() => changePeriod(value)}
              className={cn('rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50', period === value ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800')}>
              {pt(value === 'weekly' ? 'Weekly' : 'Monthly')}
            </button>)}
          </div>
          <div className="flex items-center gap-1">
            <NavButton dir="prev" disabled={exporting} onClick={() => setOffset(value => value + 1)} label={pt(period === 'weekly' ? 'Previous week' : 'Previous month')} />
            <span className="min-w-40 text-center text-[12.5px] font-semibold tabular-nums text-slate-700" aria-live="polite">{periodLabel(period, offset)}</span>
            <NavButton dir="next" disabled={exporting || offset === 0} onClick={() => setOffset(value => Math.max(0, value - 1))} label={pt(period === 'weekly' ? 'Next week' : 'Next month')} />
          </div>
          <Button size="sm" onClick={download} disabled={exporting}>
            {exporting ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <FileText aria-hidden="true" className="mr-2 h-4 w-4" />}
            {pt(exporting ? 'Preparing PDF…' : 'Download PDF')}
          </Button>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-1.5 border-t border-slate-200 pt-2.5 text-[11.5px] leading-5 text-slate-500">
        <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {pt('This report follows its own weekly or monthly period. The employment analytics filters do not change it.')}
      </p>
      {exporting && <p role="status" className="mt-2 text-[11.5px] text-slate-500">{pt('Building and downloading your report…')}</p>}
      {error && <p role="alert" className="mt-2 text-[11.5px] font-semibold text-brand-700">{error}</p>}
    </section>
  )
}
