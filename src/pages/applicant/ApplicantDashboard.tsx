// @ts-nocheck
import { Link } from 'react-router-dom'
import { CheckCircle2, Briefcase, FileText, ChevronRight, Search, User, PlusCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/lib/auth'
import { fetchApplicantDashboard } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { AnnouncementNotice } from '@/components/shared/AnnouncementNotice'
import { useCallback } from 'react'
import { usePT } from '@/lib/portalCopy'

export default function ApplicantDashboard() {
  const { user } = useAuth()
  const pt = usePT()
  
  const fetcher = useCallback(() => {
    if (!user?.email) return Promise.resolve(null)
    return fetchApplicantDashboard(user.email)
  }, [user?.email])
  const { data, loading, error, reload } = useQuery(fetcher, [user?.email])

  if (loading) return <LoadingBlock label={pt('Loading dashboard...')} />
  if (error) return <ErrorBlock message={error} onRetry={reload} />

  return (
    <div className="space-y-6">
      <AnnouncementNotice />
      <PageHeader title="Dashboard" description={pt("Welcome, {name}. Here's a quick overview of your application.", { name: user?.name || 'John' })} />

      {!data ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{pt('Complete Your Profile')}</h3>
          <p className="text-slate-500 mb-6 max-w-md">{pt("You haven't set up your applicant profile yet. Complete your profile and upload a resume to start matching with jobs.")}</p>
          <Link to="/applicant/profile" className="inline-flex items-center justify-center px-4 py-2 font-semibold text-white bg-brand-600 rounded-md hover:bg-brand-700 transition-colors">
            <PlusCircle className="mr-2 h-5 w-5" />
            {pt('Set Up Profile')}
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/applicant/status" className="block group">
              <Card className="p-5 h-full transition-shadow hover:shadow-md border border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-full bg-success-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-success-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{pt('Current Application')}</h3>
                      <p className="font-bold text-success-600 text-lg mt-1">{pt(data.status)}</p>
                      <p className="text-xs text-slate-400 mt-1">{pt('Last updated')}<br/>{data.statusUpdatedAt}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600 transition-colors" />
                </div>
              </Card>
            </Link>

            <Link to="/applicant/jobs" className="block group">
              <Card className="p-5 h-full transition-shadow hover:shadow-md border border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                      <Briefcase className="h-6 w-6 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{pt('Recommended Jobs')}</h3>
                      <p className="font-bold text-brand-600 text-lg mt-1">{pt('{count} Opportunities', { count: data.recommendedJobsCount })}</p>
                      <p className="text-xs text-slate-400 mt-1">{pt('Based on your skills')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600 transition-colors" />
                </div>
              </Card>
            </Link>

            <Link to="/applicant/profile" className="block group">
              <Card className="p-5 h-full transition-shadow hover:shadow-md border border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{pt('Latest Resume')}</h3>
                      <p className="font-bold text-brand-600 text-lg mt-1">{pt('Version {version}', { version: data.resumeCount })}</p>
                      <p className="text-xs text-slate-400 mt-1">{pt('Submitted on')}<br/>{data.resumeUpdatedAt || pt('None')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600 transition-colors" />
                </div>
              </Card>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
            <Card className="p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">{pt('Recent Updates')}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data.recentUpdates.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-500">{pt('No recent updates.')}</div>
                ) : (
                  data.recentUpdates.map((u, i) => (
                    <div key={i} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                      <div className="mt-0.5 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        {u.type === 'status' ? <CheckCircle2 className="h-4 w-4 text-success-600" /> :
                         u.type === 'match' ? <Briefcase className="h-4 w-4 text-brand-600" /> : 
                         <FileText className="h-4 w-4 text-brand-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{u.message}</p>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{u.at}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-0 overflow-hidden h-fit">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">{pt('Quick Actions')}</h3>
              </div>
              <div className="divide-y divide-slate-100 p-2">
                <Link to="/applicant/status" className="flex items-center justify-between p-3 rounded-lg hover:bg-brand-50 text-slate-700 hover:text-brand-700 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5 text-brand-600" />
                    <span className="font-semibold text-sm">{pt('Check Application Status')}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
                </Link>
                <Link to="/applicant/profile" className="flex items-center justify-between p-3 rounded-lg hover:bg-brand-50 text-slate-700 hover:text-brand-700 transition-colors group">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-brand-600" />
                    <span className="font-semibold text-sm">{pt('View My Profile')}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
                </Link>
                <Link to="/applicant/jobs" className="flex items-center justify-between p-3 rounded-lg hover:bg-brand-50 text-slate-700 hover:text-brand-700 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-brand-600" />
                    <span className="font-semibold text-sm">{pt('View Matched Opportunities')}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}





