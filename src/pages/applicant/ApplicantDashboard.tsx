// @ts-nocheck
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { Link } from 'react-router-dom'
import { CheckCircle2, Briefcase, FileText, ChevronRight, Search, User, PlusCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ButtonLink } from '@/components/ui/Button'
import { IconBox } from '@/components/ui/IconBox'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/lib/auth'
import { fetchApplicantDashboard } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { ErrorBlock } from '@/components/shared/QueryState'
import { DashboardSkeleton } from '@/components/shared/Skeletons'
import { CountUp } from '@/components/ui/CountUp'
import { AnnouncementNotice } from '@/components/shared/AnnouncementNotice'
import { useCallback } from 'react'
import { usePT } from '@/lib/portalCopy'

export default function ApplicantDashboard() {
  const { user } = useAuth()
  const pt = usePT()
  const email = user?.email
  
  const fetcher = useCallback(() => {
    if (!email) return Promise.resolve(null)
    return fetchApplicantDashboard(email)
  }, [email])
  const { data, loading, refreshing, error, reload } = useQuery(fetcher, [user?.email])

  useLiveRefresh(reload, ['applicants','applications','resumes','job_matches'])

  if (loading && !data) return <DashboardSkeleton label={pt('Loading dashboard...')} />
  if (error && !data) return <ErrorBlock message={error} onRetry={reload} />

  return (
    <div className="space-y-4">
      <AnnouncementNotice />
      <RefreshNotice error={error} refreshing={refreshing} retry={reload}/>
      <PageHeader title="Dashboard" description={pt("Welcome, {name}. Here's a quick overview of your application.", { name: user?.name || pt('Applicant') })} />

      {!data ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <User className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">{pt('Complete Your Profile')}</h3>
          <p className="mb-5 max-w-md text-sm text-slate-500">{pt("You haven't set up your applicant profile yet. Complete your profile and upload a resume to start matching with jobs.")}</p>
          <ButtonLink to="/applicant/profile" icon={<PlusCircle className="h-4 w-4" />}>
            {pt('Set Up Profile')}
          </ButtonLink>
        </Card>
      ) : (
        <>
          <div className="ui-stagger grid grid-cols-1 gap-3 md:grid-cols-3">
            <Link to="/applicant/status" className="group block">
              <Card className="h-full p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <IconBox tone="success" size="sm" round>
                      <CheckCircle2 />
                    </IconBox>
                    <div className="min-w-0">
                      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">{pt('Current Application')}</h3>
                      <p className="mt-1 text-[20px] font-bold leading-none tracking-tight text-success-700">{pt(data.status)}</p>
                      <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">{pt('Last updated')}: {data.statusUpdatedAt}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600" />
                </div>
              </Card>
            </Link>

            <Link to="/applicant/jobs" className="group block">
              <Card className="h-full p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <IconBox tone="brand" size="sm" round>
                      <Briefcase />
                    </IconBox>
                    <div className="min-w-0">
                      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">{pt('Recommended Jobs')}</h3>
                      <p className="mt-1 text-[20px] font-bold leading-none tracking-tight text-brand-700"><CountUp value={data.recommendedJobsCount} /> {pt(data.recommendedJobsCount === 1 ? 'Opportunity' : 'Opportunities')}</p>
                      <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">{pt('Based on your skills')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600" />
                </div>
              </Card>
            </Link>

            <Link to="/applicant/profile" className="group block">
              <Card className="h-full p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <IconBox tone="neutral" size="sm" round>
                      <FileText />
                    </IconBox>
                    <div className="min-w-0">
                      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">{pt('Latest Resume')}</h3>
                      <p className="mt-1 text-[20px] font-bold leading-none tracking-tight text-slate-900">{pt('Version {version}', { version: data.resumeCount })}</p>
                      <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">{pt('Submitted on')}: {data.resumeUpdatedAt || pt('None')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600" />
                </div>
              </Card>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_350px]">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-100 px-5 pb-3 pt-4">
                <h3 className="text-[15px] font-semibold text-slate-900">{pt('Recent Updates')}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data.recentUpdates.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-slate-500">{pt('No recent updates.')}</div>
                ) : (
                  data.recentUpdates.map((u, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        {u.type === 'status' ? <CheckCircle2 className="h-3.5 w-3.5 text-success-600" /> :
                         u.type === 'match' ? <Briefcase className="h-3.5 w-3.5 text-brand-600" /> : 
                         <FileText className="h-3.5 w-3.5 text-brand-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13.5px] font-medium leading-snug text-slate-800">{u.message}</p>
                      </div>
                      <span className="whitespace-nowrap text-[11.5px] text-slate-400">{u.at}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="h-fit overflow-hidden p-0">
              <div className="border-b border-slate-100 px-5 pb-3 pt-4">
                <h3 className="text-[15px] font-semibold text-slate-900">{pt('Quick Actions')}</h3>
              </div>
              <div className="divide-y divide-slate-100 p-2">
                <Link to="/applicant/status" className="group flex items-center justify-between rounded-md p-2.5 text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700">
                  <div className="flex items-center gap-2.5">
                    <Search className="h-4.5 w-4.5 text-brand-600" />
                    <span className="text-[13.5px] font-semibold">{pt('Check Application Status')}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
                </Link>
                <Link to="/applicant/profile" className="group flex items-center justify-between rounded-md p-2.5 text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700">
                  <div className="flex items-center gap-2.5">
                    <User className="h-4.5 w-4.5 text-brand-600" />
                    <span className="text-[13.5px] font-semibold">{pt('View My Profile')}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
                </Link>
                <Link to="/applicant/jobs" className="group flex items-center justify-between rounded-md p-2.5 text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700">
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="h-4.5 w-4.5 text-brand-600" />
                    <span className="text-[13.5px] font-semibold">{pt('View Matched Opportunities')}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}





