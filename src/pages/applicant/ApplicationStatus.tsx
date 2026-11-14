// @ts-nocheck
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { Link } from 'react-router-dom'
import { Briefcase, Building2, CheckCircle2, Circle, Clock, FileText } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'

import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { fetchApplicationStatusData } from '@/lib/api'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { useCallback } from 'react'
import { usePT } from '@/lib/portalCopy'
import { HiredFeedbackFlow } from '@/components/features/HiredFeedbackFlow'

export default function ApplicationStatus({ tab }: { tab: 'current' | 'previous' }) {
  const { user } = useAuth();
  const pt = usePT();

  const fetcher = useCallback(() => fetchApplicationStatusData(user?.email || ''), [user?.email])
  const { data: statusData, loading, refreshing, error, reload } = useQuery(fetcher, [user?.email])

  useLiveRefresh(reload, ['applications', 'referrals', 'status_history']);

  if (loading && !statusData) return <LoadingBlock label={pt('Loading application status...')} />
  if (error && !statusData) return <ErrorBlock message={error} onRetry={reload} />

  const applications = statusData?.applications ?? [];
  const history = statusData?.history ?? [];
  const currentApp = applications[0] ?? null;
  const previousApps = applications.slice(1);
  const referral = currentApp?.referrals?.[0] ?? null;

  const fmtDateTime = (iso: string) => (iso ? new Date(iso).toLocaleString() : '');

  return (
    <div className="space-y-6">
      <RefreshNotice error={error} refreshing={refreshing} retry={reload} />
      <PageHeader title="Application Status" description="Track the status of your applications and view your records." />
      <div className="flex flex-wrap gap-2"><HiredFeedbackFlow applications={applications.filter((app) => app.status === 'Hired')} onChanged={reload} /></div>

      <nav className="flex space-x-8 border-b border-slate-200" aria-label={pt('Status Tabs')}>
        <Link
          to="/applicant/status"
          className={cn(
            "flex items-center space-x-2 border-b-2 px-1 py-3 text-sm font-semibold focus:outline-none",
            tab === 'current' ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 transition-colors hover:text-slate-700"
          )}
        >
          <span>{pt('Current Application')}</span>
        </Link>
        <Link
          to="/applicant/status/previous"
          className={cn(
            "flex items-center space-x-2 border-b-2 px-1 py-3 text-sm font-medium focus:outline-none",
            tab === 'previous' ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 transition-colors hover:text-slate-700"
          )}
        >
          <span>{pt('Previous Applications')}</span>
        </Link>
      </nav>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {tab === 'current' ? (
          <>
            <Card className="p-6 lg:col-span-7">
              <h2 className="mb-6 text-base font-semibold text-slate-900">{pt('Application History')}</h2>

              {history.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                  {pt('No status updates recorded yet.')}
                </div>
              ) : (
                <div className="relative pl-4">
                  <div className="absolute top-2 bottom-2 left-[21px] w-px bg-slate-200" />
                  {history.map((h, i) => {
                    const isLatest = i === 0;
                    return (
                      <div key={i} className={cn("relative flex gap-4", i < history.length - 1 && "mb-8")}>
                        <div className={cn(
                          "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                          isLatest ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-600"
                        )}>
                          {isLatest ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3 fill-current" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{pt(h.status)}</h3>
                          {h.remarks && <p className="text-sm text-slate-500">{h.remarks}</p>}
                          <p className="mt-1 text-xs font-semibold text-slate-400">{fmtDateTime(h.changed_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <div className="space-y-6 lg:col-span-5">
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">{pt('Target Role')}</h3>
                  {currentApp && <StatusBadge status={currentApp.status} />}
                </div>
                {currentApp?.job_listings ? (
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 border border-brand-100">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{currentApp.job_listings.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                        <Building2 className="h-3 w-3" /> {currentApp.job_listings.companies?.name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{pt('Applied')} {fmtDateTime(currentApp.created_at)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 py-4 text-center">
                    <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    {pt('PESO is currently looking for the best matched jobs for you.')}
                  </div>
                )}
              </Card>

              {referral && (
                <Card className="p-6 border-brand-200 bg-brand-50 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 bg-brand-100 rounded-full w-24 h-24 opacity-50 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="mb-2 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-brand-600" />
                      <h3 className="font-bold text-slate-900">{pt('Referral Ready')}</h3>
                    </div>
                    <p className="text-sm text-slate-600">{pt('Referral No.')} <span className="font-semibold text-slate-900">{referral.referral_number}</span></p>
                    <p className="mb-4 text-sm text-slate-600">{pt('Issued')} {fmtDateTime(referral.date_issued)}</p>
                    <p className="mb-4 text-sm text-slate-600">
                      {pt('Please download or print your referral slip and present it to the employer during your interview.')}
                    </p>
                    <Link
                      to={`/applicant/status/referral-slip?refId=${referral.id}`}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
                    >
                      <FileText className="mr-2 h-4 w-4" /> {pt('View Referral')}
                    </Link>
                  </div>
                </Card>
              )}
            </div>
          </>
        ) : (
          <div className="lg:col-span-12">
            {previousApps.length === 0 ? (
              <Card className="p-12 text-center text-slate-500">
                <Briefcase className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <p className="text-lg font-medium text-slate-900">{pt('No previous applications found')}</p>
                <p className="mt-1">{pt('Your application history will appear here.')}</p>
              </Card>
            ) : (
              <Card className="divide-y divide-slate-100 p-0">
                {previousApps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 border border-brand-100">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{app.job_listings?.title || pt('Application')}</p>
                        <p className="text-sm text-slate-500">{app.job_listings?.companies?.name || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-xs font-semibold text-slate-400">{fmtDateTime(app.created_at)}</span>
                      <StatusBadge status={app.status} />
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
