import { useRef, useState } from 'react'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui'
import { usePT } from '@/lib/portalCopy'
import type { EmploymentAnalyticsData } from '@/lib/employmentAnalytics'
import { downloadMonthlyEmploymentPdf } from '@/lib/analyticsViewReport'

export function AnalyticsExportMenu({ data, disabled=false, refreshing=false, onRefresh }: { data: EmploymentAnalyticsData | null; disabled?: boolean; refreshing?: boolean; onRefresh: () => void }) {
  const pt=usePT(),[busy,setBusy]=useState(false)
  const locked=useRef(false)
  const exportReport=async()=>{
    if(locked.current || disabled || !data)return
    locked.current=true;setBusy(true)
    const toastId=toast.loading(pt('Preparing monthly report…'))
    try{
      await downloadMonthlyEmploymentPdf(data)
      toast.success(pt('Monthly report downloaded.'),{id:toastId})
    }catch(error){toast.error(error instanceof Error?error.message:pt('The report could not be generated.'),{id:toastId})}
    finally{locked.current=false;setBusy(false)}
  }
  return <div className="analytics-report-tools flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
    <Button size="sm" disabled={disabled||busy||!data} onClick={exportReport} icon={busy?<Loader2 aria-hidden="true" className="h-4 w-4 animate-spin"/>:<Download aria-hidden="true" className="h-4 w-4"/>}>{pt(busy?'Preparing…':'Export PDF')}</Button>
    <Button size="sm" variant="neutral" className="analytics-refresh px-0 sm:px-2.5" aria-label={pt('Refresh')} title={pt('Refresh')} disabled={refreshing} onClick={onRefresh} icon={<RefreshCw aria-hidden="true" className="h-4 w-4"/>}><span className="hidden sm:inline">{pt('Refresh')}</span></Button>
  </div>
}
