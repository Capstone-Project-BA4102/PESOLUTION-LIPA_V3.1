import { lazy, Suspense } from 'react'
import { ArrowRight, BarChart3, Briefcase, Sparkles, Star, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { SummaryReportCard } from '@/components/admin/SummaryReportCard'
import { EmploymentAnalytics } from '@/components/admin/EmploymentAnalytics'
import { FeedbackAnalyticsSkeleton } from '@/components/shared/Skeletons'
import { usePT } from '@/lib/portalCopy'

// Feedback charts pull in recharts; load them only when that tab is opened.
const FeedbackAnalyticsPage = lazy(() => import('@/pages/superadmin/FeedbackAnalyticsPage'))

const SCOPES = [
  { id: 'applicant-demographics', label: 'Applicant demographics', hint: 'Gender, education, barangay and latest application status.', Icon: Users },
  { id: 'job-demand', label: 'Job demand trends', hint: 'Monthly posting volume, industries, positions and companies.', Icon: Briefcase },
  { id: 'common-skills', label: 'Common skills', hint: 'Required skills in listings and the gaps saved for applicants.', Icon: Sparkles },
]

const TABS = [
  { key: 'employment', label: 'Employment analytics', icon: <BarChart3 /> },
  { key: 'feedback', label: 'Feedback sentiment', icon: <Star /> },
]

export default function AnalyticsPage() {
  const pt = usePT()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'feedback' ? 'feedback' : 'employment'
  const setTab = (key: string) => setSearchParams(params => {
    const next = new URLSearchParams(params)
    if (key === 'employment') next.delete('tab')
    else next.set('tab', key)
    return next
  }, { replace: true })

  return <div className="space-y-4">
    <PageHeader
      title="Analytics"
      description="Employment analytics and hired-applicant feedback across Lipa City."
    />

    <Tabs items={TABS} active={tab} onChange={setTab} />

    {tab === 'employment'
      ? <div role="tabpanel" aria-label={pt('Employment analytics')} className="space-y-4">
        <SummaryReportCard />

        <nav aria-label={pt('Analytics sections')} className="ui-stagger grid min-w-0 gap-3 md:grid-cols-3">
          {SCOPES.map(({ id, label, hint, Icon }) => <a key={id} href={`#${id}`}
            className="studio-card group flex min-w-0 items-start gap-3 p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700" aria-hidden="true"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-slate-900">{pt(label)}</span>
              <span className="mt-0.5 block text-[11.5px] leading-5 text-slate-500">{pt(hint)}</span>
            </span>
            <ArrowRight aria-hidden="true" className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
          </a>)}
        </nav>

        <EmploymentAnalytics />
      </div>
      : <div role="tabpanel" aria-label={pt('Feedback sentiment')}>
        <Suspense fallback={<FeedbackAnalyticsSkeleton label={pt('Loading feedback dashboard...')} embedded />}>
          <FeedbackAnalyticsPage embedded />
        </Suspense>
      </div>}
  </div>
}
