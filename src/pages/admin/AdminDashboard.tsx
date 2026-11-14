import { Building2, Briefcase, GitCompareArrows, UserPlus, Info } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchActivities, type ActivityType } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { usePT } from '@/lib/portalCopy'
import { ErrorBlock } from '@/components/shared/QueryState'
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { SummaryReportCard } from '@/components/admin/SummaryReportCard'
import { EmploymentAnalytics } from '@/components/admin/EmploymentAnalytics'
import { cn } from '@/lib/utils'
const ICONS: Record<ActivityType, { icon: React.ReactNode; color: string; bg: string }> = {
  applicant: { icon: <UserPlus />, color: 'text-success-600', bg: 'bg-success-100' },
  company: { icon: <Building2 />, color: 'text-info-600', bg: 'bg-info-100' },
  job: { icon: <Briefcase />, color: 'text-brand-600', bg: 'bg-brand-100' },
  referral: { icon: <Info />, color: 'text-brand-600', bg: 'bg-brand-100' },
}
const recent = () => fetchActivities(3)
export default function AdminDashboard() {
  const pt = usePT()
  const { data: activities, loading, refreshing, error, reload } = useQuery(recent)
  useLiveRefresh(reload, ['activity_logs'])
  return <div className="space-y-4">
    <PageHeader title="Dashboard" description="Welcome back, PESO Admin. Here's what's happening today."/>
    <SummaryReportCard/>
    <EmploymentAnalytics sidebar={<>
    <Card className="p-3"><h2 className="mb-2 text-sm font-bold text-slate-800">{pt('Quick Actions')}</h2><div className="grid gap-1">
      <ButtonLink to="/admin/applicants/register" variant="ghost" size="sm" className="justify-start px-2 text-left text-xs"><UserPlus className="h-4 w-4 shrink-0"/>{pt('Register Walk-in')}</ButtonLink>
      <ButtonLink to="/admin/companies/new" variant="ghost" size="sm" className="justify-start px-2 text-left text-xs"><Building2 className="h-4 w-4 shrink-0"/>{pt('Add New Company')}</ButtonLink>
      <ButtonLink to="/admin/jobs/new" variant="ghost" size="sm" className="justify-start px-2 text-left text-xs"><Briefcase className="h-4 w-4 shrink-0"/>{pt('Add Job Listing')}</ButtonLink>
      <ButtonLink to="/admin/matching" variant="ghost" size="sm" className="justify-start px-2 text-left text-xs"><GitCompareArrows className="h-4 w-4 shrink-0"/>{pt('View Matching & Referrals')}</ButtonLink>
    </div></Card>
    <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-3"><h2 className="text-sm font-bold text-slate-800">{pt('Recent Activities')}</h2><ButtonLink to="/admin/activities" variant="ghost" size="sm">{pt('See all')}</ButtonLink></div>
      <div className="px-3"><RefreshNotice error={activities ? error : null} refreshing={refreshing && !!activities} retry={reload}/></div>
      {loading && !activities ? <p role="status" className="p-6 text-sm text-slate-500">{pt('Loading activities…')}</p> : error && !activities ? <ErrorBlock message={error} onRetry={reload}/> : !activities?.length ? <p className="p-6 text-center text-sm text-slate-500">{pt('No recent activities')}</p> : <div className="divide-y divide-slate-100">{activities.map(activity => {
        const style = ICONS[activity.type] || ICONS.referral
        return <div key={activity.id} className="flex items-start justify-between gap-2 p-3"><div className="flex min-w-0 gap-3"><span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full [&>svg]:h-4 [&>svg]:w-4', style.bg, style.color)}>{style.icon}</span><div className="min-w-0"><p className="text-xs font-semibold text-slate-800">{pt(activity.title)}</p><p className="break-words text-xs leading-5 text-slate-500">{pt(activity.desc)}</p>{activity.meta && <Badge tone="success" wrap className="mt-1">{activity.meta}</Badge>}<span className="mt-1 block text-[11px] text-slate-500">{activity.time}</span></div></div></div>
      })}</div>}
    </Card>
    </>}/>
    <p className="text-xs text-slate-500">{pt('Weekly/monthly exports use their own reporting periods. Analytics filters above do not change the existing report.')}</p>
  </div>
}
