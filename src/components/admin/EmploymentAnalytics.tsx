import { useCallback, useState, type ReactNode } from 'react'
import { Users, Briefcase, UserCheck, Layers, ChevronDown } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { ErrorBlock } from '@/components/shared/QueryState'
import { EmploymentAnalyticsSkeleton } from '@/components/shared/Skeletons'
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { BARANGAYS } from '@/constants/options'
import { fetchEmploymentAnalytics, initialAnalyticsFilters } from '@/lib/employmentAnalytics'
import { reportingMonthRange, currentReportingMonth } from '@/lib/reportingPeriod'
import { AnalyticsExportMenu } from './AnalyticsExportMenu'
import { useQuery } from '@/lib/useQuery'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { usePT } from '@/lib/portalCopy'
import { CountUp } from '@/components/ui/CountUp'
import { AnalyticsChart } from './AnalyticsChart'
function AnalyticsSection({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  const pt = usePT()
  // Open by default: an analytics hub should show its data, not hide it behind three clicks.
  const [open, setOpen] = useState(true)
  return <details id={id} open={open} className="group scroll-mt-24 studio-card" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-[13.5px] font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-brand-600">
      {pt(title)}<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"/>
    </summary>
    {open && <div className="border-t border-slate-200 p-3">{children}</div>}
  </details>
}
export function EmploymentAnalytics({ sidebar }: { sidebar?: ReactNode }) {
  const pt = usePT()
  const [filters, setFilters] = useState(initialAnalyticsFilters)
  const [draft, setDraft] = useState(filters)
  const [filterError, setFilterError] = useState('')
  const fetcher = useCallback(() => fetchEmploymentAnalytics(filters), [filters])
  const { data, loading, refreshing, error, reload } = useQuery(fetcher, [filters])
  useLiveRefresh(reload, ['applicants','applications','job_listings','companies','job_matches'])
  const educationOptions = [...new Set([...(data?.options.education || []), ...(draft.education ? [draft.education] : [])])]
  const companyOptions = [...(data?.options.companies || [])]
  if (draft.company && !companyOptions.some(option => option.value === draft.company)) companyOptions.push({ value: draft.company, label: pt('Selected company (unavailable)') })
  const exportData=data && Object.entries(filters).every(([key,value])=>data.filters[key as keyof typeof filters]===value) ? data : null
  return <section className="space-y-3" aria-label={pt('Employment Analytics')}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-base font-bold text-slate-900">{pt('Employment overview')}</h2><p className="text-xs text-slate-500">{new Date(`${data?.filters.from || filters.from}T12:00:00+08:00`).toLocaleDateString('en-PH',{month:'long',year:'numeric',timeZone:'Asia/Manila'})}{data && [data.filters.barangay, data.filters.education, data.options.companies.find(company => company.value === data.filters.company)?.label, data.filters.jobStatus].filter(Boolean).map(value => ` · ${pt(value!)}`)}</p></div>
      <div className="ml-auto flex min-w-0 max-w-full items-end justify-end">
        <AnalyticsExportMenu data={exportData} disabled={loading || refreshing} refreshing={refreshing} onRefresh={reload}/>
      </div>
    </div>
    <details className="studio-card"><summary className="cursor-pointer px-3 py-2 text-[12.5px] font-semibold text-slate-700">{pt('Filters')}</summary><div className="border-t border-slate-200 p-3">
<form className="space-y-3" onSubmit={event => {
      event.preventDefault()
      try {
        const month=draft.from.slice(0,7)
        if(month>currentReportingMonth())throw new Error(pt('Choose the current month or an earlier month.'))
        const range=reportingMonthRange(month)
        setFilterError('');setFilters({...draft,...range})
      } catch { setFilterError(pt('Choose a valid reporting month.')) }
    }}>
      <div className="max-w-xs"><Input label="Reporting month" type="month" required min="2000-01" max={currentReportingMonth()} value={draft.from.slice(0,7)} onChange={event=>{
        const month=event.target.value
        if(!month){setDraft({...draft,from:'',to:''});return}
        try{setDraft({...draft,...reportingMonthRange(month)});setFilterError('')}catch{setFilterError(pt('Choose a valid reporting month.'))}
      }}/></div>
      <div className="grid gap-4 lg:grid-cols-2"><fieldset className="min-w-0 space-y-2"><legend className="text-xs font-bold text-slate-500">{pt('Applicant filters · registration date')}</legend><div className="grid gap-3 sm:grid-cols-2"><Select label="Barangay" placeholder="All barangays" options={BARANGAYS} value={draft.barangay} onChange={event => setDraft({ ...draft, barangay: event.target.value })}/><Select label="Education" placeholder="All education levels" options={educationOptions} value={draft.education} onChange={event => setDraft({ ...draft, education: event.target.value })}/></div></fieldset>
      <fieldset className="min-w-0 space-y-2"><legend className="text-xs font-bold text-slate-500">{pt('Job filters · posting date')}</legend><div className="grid gap-3 sm:grid-cols-2"><Select label="Company" placeholder="All companies" options={companyOptions} value={draft.company} onChange={event => setDraft({ ...draft, company: event.target.value })}/><Select label="Job status" placeholder="All statuses" options={['Active','Closed','Inactive']} value={draft.jobStatus} onChange={event => setDraft({ ...draft, jobStatus: event.target.value })}/></div></fieldset></div>
      {filterError && <p role="alert" className="text-sm text-brand-700">{filterError}</p>}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="neutral" size="sm" onClick={() => { const defaults = initialAnalyticsFilters(); setDraft(defaults); setFilters(defaults); setFilterError('') }}>{pt('Reset filters')}</Button><Button type="submit" size="sm">{pt('Apply filters')}</Button></div>
    </form>
    </div></details>
    <div className={`grid min-w-0 items-start gap-4 ${sidebar ? 'xl:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]' : ''}`}>
    <div className="min-w-0 space-y-3">
    {loading && !data ? <EmploymentAnalyticsSkeleton label={pt('Loading employment analytics…')}/> : !data ? <ErrorBlock message={error || pt('Analytics unavailable.')} onRetry={reload}/> : <>
      <RefreshNotice error={error} refreshing={refreshing} retry={reload}/>
      <div className="ui-stagger studio-kpis">
        {[
          { label: 'Applicants', value: data.totals.applicants, Icon: Users, foot: 'Registered applicants in the selected period.' },
          { label: 'Job listings', value: data.totals.listings, Icon: Briefcase, foot: 'Job listings in scope' },
          { label: 'Available positions now', value: data.totals.availablePositions, Icon: Layers, foot: 'Open slots in active listings.' },
          { label: 'Matched applicants', value: data.totals.matchedApplicants, Icon: UserCheck, foot: 'Applicants with saved compatible matches' },
        ].map(({ label, value, Icon, foot }) => <div key={label} className="studio-kpi is-static">
          <span className="k-label"><span>{pt(label)}</span><Icon aria-hidden="true" /></span>
          <span className="k-value"><CountUp value={value} /></span>
          <span className="k-foot">{pt(foot)}</span>
        </div>)}
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <AnalyticsChart compact title="Registered applicants by month" kind="line" rows={data.registrations} hint="New registrations by actual registration date."/>
        <AnalyticsChart compact title="Job listings posted by month" kind="line" rows={data.demand.monthly} hint="Listing counts by actual posting date."/>
      </div>
      <AnalyticsSection title="Applicant demographics" id="applicant-demographics">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2"><AnalyticsChart title="Recorded gender" kind="donut" rows={data.demographics.gender} hint="One count per applicant. Missing values remain unknown."/><AnalyticsChart title="Educational attainment" kind="columns" rows={data.demographics.education} hint="One count per applicant in the selected registration cohort."/><AnalyticsChart title="Barangay distribution" rows={data.demographics.barangay} hint="Official Lipa names; other or historical spellings are grouped separately. Chart shows the top 10; exact values include all categories."/><AnalyticsChart title="Latest application status" kind="donut" rows={data.demographics.status} hint="Current status of each applicant’s latest application; not a historical employment rate."/></div>
      </AnalyticsSection>
      <AnalyticsSection title="Job demand details" id="job-demand">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2"><AnalyticsChart title="Recorded job status" kind="donut" rows={data.demand.status} hint="Current recorded listing status within the posting cohort. Available positions exclude filled and expired listings."/><AnalyticsChart title="Listings by industry" rows={data.demand.industry} hint="Distinct job listings, not the number of positions. Top 10 shown."/><AnalyticsChart title="Most listed job positions" rows={data.demand.positions} hint="Distinct listing IDs grouped by recorded job title. Top 10 shown."/></div>
      <div className="mt-3"><AnalyticsChart title="Listings by company" rows={data.demand.company} hint="Distinct listings by company in the selected posting cohort. Top 10 shown."/></div>
      </AnalyticsSection>
      <AnalyticsSection title="Common skills" id="common-skills">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2"><AnalyticsChart title="Required hard skills · top 10" rows={data.skills.hard} hint="Count of distinct selected job listings requiring each skill. Repeated entries within a listing count once."/><AnalyticsChart title="Required soft skills · top 10" rows={data.skills.soft} hint="Same counting basis as hard skills; soft requirements are counted separately."/><AnalyticsChart title="Missing hard skills · top 10" rows={data.skills.missingHard} hint="Distinct applicants with each saved gap, across selected available jobs scoring at least 60%. Not all applicants or all jobs."/><AnalyticsChart title="Missing soft skills · top 10" rows={data.skills.missingSoft} hint="Distinct applicants with each saved gap. Repeated gaps across jobs count once per applicant; no new NLP calculation is performed."/></div>
      </AnalyticsSection>

    </>}
    </div>
    {sidebar && <aside aria-label={pt('Dashboard shortcuts and activities')} className="min-w-0 space-y-3">{sidebar}</aside>}
    </div>
  </section>
}
