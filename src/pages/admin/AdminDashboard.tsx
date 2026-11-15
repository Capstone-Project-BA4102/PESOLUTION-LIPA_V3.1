import { ArrowRight, BarChart3, Briefcase, Building2, FileCheck2, GitCompareArrows, UserCheck, UserPlus, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Display'
import { StatusBadge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { CountUp } from '@/components/ui/CountUp'
import { fetchActivities, fetchAdminOverview } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { usePT } from '@/lib/portalCopy'
import { ErrorBlock } from '@/components/shared/QueryState'
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { ActivityBadge, ActivityIcon } from '@/components/shared/ActivityPresentation'
import { normalizeActivityText } from '@/lib/activityPresentation'
import { cn } from '@/lib/utils'

const recentActivities = () => fetchActivities(6)

export default function AdminDashboard() {
  const pt = usePT()
  const { data: overview, loading: overviewLoading, refreshing: overviewRefreshing, error: overviewError, reload: reloadOverview } = useQuery(fetchAdminOverview)
  const { data: activities, loading, refreshing, error, reload } = useQuery(recentActivities)
  useLiveRefresh(reloadOverview, ['applicants', 'job_listings', 'referrals', 'applications', 'job_matches'])
  useLiveRefresh(reload, ['activity_logs'])

  const kpis = overview ? [
    { label: 'Registered applicants', Icon: Users, value: overview.totals.applicants, foot: <><span className="font-semibold text-success-700">▲ {overview.addedThisMonth}</span> {pt('added this month')}</> },
    { label: 'Active job postings', Icon: Briefcase, value: overview.totals.activeJobs, foot: pt(overview.totals.openVacancies === 1 ? '{count} open vacancy' : '{count} open vacancies', { count: overview.totals.openVacancies }) },
    { label: 'Referrals issued', Icon: FileCheck2, value: overview.totals.referrals, foot: <><span className="font-semibold text-success-700">▲ {overview.referralsThisMonth}</span> {pt('this month')}</> },
    { label: 'Hired through PESO', Icon: UserCheck, value: overview.totals.hired, foot: `${overview.totals.applicants ? Math.round((overview.totals.hired / overview.totals.applicants) * 100) : 0}% ${pt('of registered applicants')}` },
  ] : []
  const pipeline = overview ? [
    { label: 'Matched', value: overview.pipeline.matched, bar: 'bg-success-600' },
    { label: 'Referred', value: overview.pipeline.referred, bar: 'bg-brand-600' },
    { label: 'Hired', value: overview.pipeline.hired, bar: 'bg-success-700' },
    { label: 'Needs match', value: overview.pipeline.needsMatch, bar: 'bg-warning-500' },
  ] : []
  const share = (value: number) => (overview?.totals.applicants ? Math.round((value / overview.totals.applicants) * 100) : 0)

  return <div className="space-y-4">
    <PageHeader
      title="Home"
      description="Lipa City employment operations at a glance — live records from Supabase."
      actions={<>
        <ButtonLink to="/admin/applicants/register" variant="neutral" size="sm" icon={<UserPlus className="h-4 w-4" />}>{pt('Register Walk-in')}</ButtonLink>
        <ButtonLink to="/admin/companies/new" variant="neutral" size="sm" icon={<Building2 className="h-4 w-4" />}>{pt('Add New Company')}</ButtonLink>
        <ButtonLink to="/admin/jobs/new" variant="neutral" size="sm" icon={<Briefcase className="h-4 w-4" />}>{pt('Add Job Listing')}</ButtonLink>
        <ButtonLink to="/admin/matching" size="sm" icon={<GitCompareArrows className="h-4 w-4" />}>{pt('View Matching & Referrals')}</ButtonLink>
      </>}
    />
    <RefreshNotice error={overview ? overviewError : null} refreshing={overviewRefreshing && !!overview} retry={reloadOverview} />

    <div className="studio-kpis ui-stagger">
      {kpis.length ? kpis.map(({ label, Icon, value, foot }) => <div key={label} className="studio-kpi is-static">
        <span className="k-label"><span>{pt(label)}</span><Icon aria-hidden="true" /></span>
        <span className="k-value"><CountUp value={value} /></span>
        <span className="k-foot">{foot}</span>
      </div>) : ['Registered applicants', 'Active job postings', 'Referrals issued', 'Hired through PESO'].map(label => <div key={label} className="studio-kpi is-static">
        <span className="k-label"><span className="sr-only">{pt(label)}</span><span className="ui-skeleton h-3 w-2/3 rounded" /></span>
        <span className="k-value"><span className="ui-skeleton block h-6 w-16 rounded" /></span>
        <span className="k-foot"><span className="ui-skeleton block h-2.5 w-4/5 rounded" /></span>
      </div>)}
    </div>

    {overviewError && !overview && <ErrorBlock message={overviewError} onRetry={reloadOverview} />}

    <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,1fr)]">
      <section className="studio-card" aria-labelledby="recent-applicants-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
          <h2 id="recent-applicants-heading" className="text-[13.5px] font-bold text-slate-900">{pt('Recent applicants')}</h2>
          <span className="text-[12px] text-slate-500">{pt('Newest registrations')}</span>
        </div>
        {overviewLoading && !overview ? <div className="space-y-2 p-3" role="status">
          <span className="sr-only">{pt('Loading applicants…')}</span>
          {[0, 1, 2, 3].map(index => <div key={index} className="flex items-center gap-2 py-1">
            <div className="ui-skeleton h-7 w-7 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="ui-skeleton h-3 w-1/3 rounded" />
              <div className="ui-skeleton h-2.5 w-1/5 rounded" />
            </div>
            <div className="ui-skeleton h-5 w-16 shrink-0 rounded-md" />
            <div className="ui-skeleton hidden h-3 w-20 shrink-0 rounded sm:block" />
          </div>)}
        </div>
          : !overview ? null
            : !overview.recentApplicants.length ? <p className="p-6 text-center text-[13px] text-slate-500">{pt('No applicants yet.')}</p>
              : <div className="studio-table-wrap">
                <table className="studio-table">
                  <caption className="sr-only">{pt('Newest applicant registrations')}</caption>
                  <thead><tr>
                    <th scope="col">{pt('Applicant')}</th>
                    <th scope="col">{pt('Education')}</th>
                    <th scope="col">{pt('Status')}</th>
                    <th scope="col">{pt('Registered')}</th>
                  </tr></thead>
                  <tbody>
                    {overview.recentApplicants.map(applicant => <tr key={applicant.id}>
                      <td>
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar name={applicant.name} className="!h-7 !w-7 !text-[10.5px]" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900">{applicant.name}</p>
                            <p className="text-[11.5px] text-slate-500">{applicant.code}{applicant.barangay ? ` · ${applicant.barangay}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-[12.5px] text-slate-600">{applicant.education || '—'}</span></td>
                      <td>{applicant.status ? <StatusBadge status={applicant.status} /> : <span className="text-slate-500">—</span>}</td>
                      <td><span className="text-[12px] text-slate-500">{applicant.registeredAt}</span></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>}
        <div className="border-t border-slate-200 px-3 py-2">
          <ButtonLink to="/admin/applicants" variant="ghost" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
            {overview ? pt('View all {count} applicants', { count: overview.totals.applicants }) : pt('View all applicants')}
          </ButtonLink>
        </div>
      </section>

      <aside className="grid min-w-0 gap-3" aria-label={pt('Dashboard summaries')}>
        <section className="studio-card" aria-labelledby="pipeline-heading">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
            <h2 id="pipeline-heading" className="text-[13.5px] font-bold text-slate-900">{pt('Referral pipeline')}</h2>
            <span className="text-[12px] text-slate-500">{pt('Share of registered applicants')}</span>
          </div>
          <div className="grid gap-2.5 p-3">
            {pipeline.length ? pipeline.map(row => <div key={row.label}>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-semibold text-slate-600">{pt(row.label)}</span>
                <span className="font-bold tabular-nums text-slate-900"><CountUp value={row.value} /></span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div className={cn('h-full rounded-full transition-[width] duration-500', row.bar)} style={{ width: `${share(row.value)}%` }} />
              </div>
            </div>) : <div className="space-y-2.5" role="status">
              <span className="sr-only">{pt('Loading dashboard…')}</span>
              {[0, 1, 2, 3].map(index => <div key={index}>
                <div className="flex items-center justify-between gap-2">
                  <div className="ui-skeleton h-2.5 w-20 rounded" />
                  <div className="ui-skeleton h-2.5 w-6 rounded" />
                </div>
                <div className="ui-skeleton mt-1 h-1.5 w-full rounded-full" />
              </div>)}
            </div>}
          </div>
          <div className="border-t border-slate-200 px-3 py-2">
            <ButtonLink to="/admin/matching" variant="ghost" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>{pt('Open matching')}</ButtonLink>
          </div>
        </section>

        <section className="studio-card p-3" aria-labelledby="analytics-shortcut-heading">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700" aria-hidden="true"><BarChart3 className="h-4 w-4" /></span>
            <div className="min-w-0">
              <h2 id="analytics-shortcut-heading" className="text-[13.5px] font-bold text-slate-900">{pt('Descriptive analytics')}</h2>
              <p className="mt-0.5 text-[12px] leading-5 text-slate-500">{pt('Applicant demographics · Job demand trends · Common skills, plus hired-applicant feedback.')}</p>
            </div>
          </div>
          <ButtonLink to="/admin/analytics" variant="ghost" size="sm" className="mt-1" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>{pt('Open analytics')}</ButtonLink>
        </section>
      </aside>
    </div>

    <section className="studio-card overflow-hidden" aria-labelledby="activity-heading">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
        <h2 id="activity-heading" className="text-[13.5px] font-bold text-slate-900">{pt('Activity')}</h2>
        <ButtonLink to="/admin/activities" variant="ghost" size="sm">{pt('See all')}</ButtonLink>
      </div>
      <div className="px-3"><RefreshNotice error={activities ? error : null} refreshing={refreshing && !!activities} retry={reload} /></div>
      {loading && !activities ? <div className="divide-y divide-slate-200" role="status">
        <span className="sr-only">{pt('Loading activities…')}</span>
        {[0, 1, 2, 3].map(index => <div key={index} className="flex gap-2.5 px-3 py-2.5">
          <div className="ui-skeleton h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="ui-skeleton h-3 w-1/4 rounded" />
            <div className="ui-skeleton h-3 w-2/3 rounded" />
            <div className="ui-skeleton h-2.5 w-1/2 rounded" />
          </div>
        </div>)}
      </div>
        : error && !activities ? <div className="p-3"><ErrorBlock message={error} onRetry={reload} /></div>
          : !activities?.length ? <p className="p-5 text-center text-[12.5px] text-slate-500">{pt('No recent activities')}</p>
            : <div className="max-h-[420px] divide-y divide-slate-200 overflow-y-auto">
              {activities.map(activity => <div key={activity.id} className="flex gap-2.5 px-3 py-2.5">
                <ActivityIcon activity={activity} />
                <div className="min-w-0">
                  <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-1"><ActivityBadge activity={activity} /><span className="text-[11px] text-slate-500">{activity.time}</span></div>
                  <p className="text-[12.5px] font-semibold text-slate-800">{pt(activity.title)}</p>
                  <p className="text-[12px] leading-5 break-words text-slate-500">{normalizeActivityText(pt(activity.desc), pt)}</p>
                </div>
              </div>)}
            </div>}
    </section>
  </div>
}
