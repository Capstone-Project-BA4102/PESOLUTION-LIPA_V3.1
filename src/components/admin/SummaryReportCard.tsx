import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Form'
import { usePT } from '@/lib/portalCopy'
import { fetchSummaryReport, type ReportPeriod } from '@/lib/api'
import { downloadSummaryReportPdf } from '@/lib/summaryReportPdf'
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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-5 w-5" />
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
    <section aria-label={pt('Report download')} className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-bold text-slate-900">{pt('Reports')}</h2><p className="text-xs text-slate-500">{pt('Choose a period and download the PDF.')}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label={pt('Report period')} className="h-9 text-sm" value={period} disabled={!!exporting} onChange={event => changePeriod(event.target.value as ReportPeriod)} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]}/>
          <div className="flex items-center gap-1">
            <NavButton dir="prev" disabled={!!exporting} onClick={() => setOffset(value => value + 1)} label={pt(period === 'weekly' ? 'Previous week' : 'Previous month')}/>
            <span className="min-w-24 text-center text-xs text-slate-600">{offset === 0 ? pt(period === 'weekly' ? 'Current week' : 'Current month') : pt('{count} period(s) ago', { count: offset })}</span>
            <NavButton dir="next" disabled={!!exporting || offset === 0} onClick={() => setOffset(value => Math.max(0, value - 1))} label={pt(period === 'weekly' ? 'Next week' : 'Next month')}/>
          </div>
          <Button size="sm" onClick={download} disabled={!!exporting}>
            {exporting ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin"/> : <FileText aria-hidden="true" className="mr-2 h-4 w-4"/>}{pt(exporting ? 'Preparing PDF…' : 'Download PDF')}
          </Button>
        </div>
      </div>
      {exporting && <p role="status" className="mt-2 text-xs text-slate-500">{pt('Building and downloading your report…')}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-brand-700">{error}</p>}
    </section>
  )
}
