import { ArrowRight, Briefcase, Sparkles, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SummaryReportCard } from '@/components/admin/SummaryReportCard'
import { EmploymentAnalytics } from '@/components/admin/EmploymentAnalytics'
import { usePT } from '@/lib/portalCopy'

const SCOPES = [
  { id: 'applicant-demographics', label: 'Applicant demographics', hint: 'Gender, education, barangay and latest application status.', Icon: Users },
  { id: 'job-demand', label: 'Job demand trends', hint: 'Monthly posting volume, industries, positions and companies.', Icon: Briefcase },
  { id: 'common-skills', label: 'Common skills', hint: 'Required skills in listings and the gaps saved for applicants.', Icon: Sparkles },
]

export default function AnalyticsPage() {
  const pt = usePT()
  return <div className="space-y-4">
    <PageHeader
      title="Analytics"
      description="Employment analytics across Lipa City."
    />

    <div aria-label={pt('Employment analytics')} className="space-y-4">
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
  </div>
}
