import { useCallback, useState, type ReactNode } from 'react'
import { Users, Briefcase, UserCheck, Layers, RefreshCw, ChevronDown } from 'lucide-react'
import { Card, Button, Input, Select } from '@/components/ui'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { BARANGAYS } from '@/constants/options'
import { fetchEmploymentAnalytics, initialAnalyticsFilters } from '@/lib/employmentAnalytics'
import { useQuery } from '@/lib/useQuery'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { usePT } from '@/lib/portalCopy'
import { AnalyticsChart } from './AnalyticsChart'
function AnalyticsSection({ title, children }: { title: string; children: ReactNode }) {
  const pt = usePT()
  const [open, setOpen] = useState(false)
  return <details className="group rounded-lg border border-slate-200 bg-white" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-brand-600">
      {pt(title)}<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"/>
    </summary>
    {open && <div className="border-t border-slate-100 p-3">{children}</div>}
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
  return <section className="space-y-3" aria-label={pt('Employment Analytics')}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-base font-bold text-slate-900">{pt('Employment overview')}</h2><p className="text-xs text-slate-500">{data?.filters.from || filters.from} – {data?.filters.to || filters.to}{data && [data.filters.barangay, data.filters.education, data.options.companies.find(company => company.value === data.filters.company)?.label, data.filters.jobStatus].filter(Boolean).map(value => ` · ${pt(value!)}`)}</p></div>
      <Button size="sm" variant="neutral" disabled={refreshing} onClick={reload}><RefreshCw aria-hidden="true" className="mr-2 h-4 w-4"/>{pt('Refresh')}</Button>
    </div>
    <details className="rounded-lg border border-slate-200 bg-white"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-700">{pt('Filters')}</summary><div className="border-t border-slate-100 p-3">
<form className="space-y-3" onSubmit={event => { event.preventDefault(); if (!draft.from || !draft.to || draft.from > draft.to) { setFilterError(pt('Choose a valid date range.')); return } setFilterError(''); setFilters({ ...draft }) }}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2"><Input label="From" type="date" required value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })}/><Input label="To" type="date" required value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })}/></div>
      <div className="grid gap-4 lg:grid-cols-2"><fieldset className="min-w-0 space-y-2"><legend className="text-xs font-bold text-slate-500">{pt('Applicant filters · registration date')}</legend><div className="grid gap-3 sm:grid-cols-2"><Select label="Barangay" placeholder="All barangays" options={BARANGAYS} value={draft.barangay} onChange={event => setDraft({ ...draft, barangay: event.target.value })}/><Select label="Education" placeholder="All education levels" options={educationOptions} value={draft.education} onChange={event => setDraft({ ...draft, education: event.target.value })}/></div></fieldset>
      <fieldset className="min-w-0 space-y-2"><legend className="text-xs font-bold text-slate-500">{pt('Job filters · posting date')}</legend><div className="grid gap-3 sm:grid-cols-2"><Select label="Company" placeholder="All companies" options={companyOptions} value={draft.company} onChange={event => setDraft({ ...draft, company: event.target.value })}/><Select label="Job status" placeholder="All statuses" options={['Active','Closed','Inactive']} value={draft.jobStatus} onChange={event => setDraft({ ...draft, jobStatus: event.target.value })}/></div></fieldset></div>
      {filterError && <p role="alert" className="text-sm text-brand-700">{filterError}</p>}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="neutral" size="sm" onClick={() => { const defaults = initialAnalyticsFilters(); setDraft(defaults); setFilters(defaults); setFilterError('') }}>{pt('Reset filters')}</Button><Button type="submit" size="sm">{pt('Apply filters')}</Button></div>
    </form>
    </div></details>
    <div className={`grid min-w-0 items-start gap-4 ${sidebar ? 'xl:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]' : ''}`}>
    <div className="min-w-0 space-y-3">
    {loading && !data ? <LoadingBlock label={pt('Loading employment analytics…')}/> : !data ? <ErrorBlock message={error || pt('Analytics unavailable.')} onRetry={reload}/> : <>
      <RefreshNotice error={error} refreshing={refreshing} retry={reload}/>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ label: 'Applicants', value: data.totals.applicants, Icon: Users }, { label: 'Job listings', value: data.totals.listings, Icon: Briefcase }, { label: 'Available positions now', value: data.totals.availablePositions, Icon: Layers }, { label: 'Matched applicants', value: data.totals.matchedApplicants, Icon: UserCheck }].map(({ label, value, Icon }) => <Card key={label} className="flex min-w-0 items-center gap-3 p-3"><Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-600"/><div className="min-w-0"><p className="text-xs leading-4 text-slate-500">{pt(label)}</p><p className="mt-1 text-2xl font-bold leading-none tabular-nums text-slate-900">{value}</p></div></Card>)}
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <AnalyticsChart compact title="Registered applicants by month" kind="line" rows={data.registrations} hint="New registrations by actual registration date."/>
        <AnalyticsChart compact title="Job listings posted by month" kind="line" rows={data.demand.monthly} hint="Listing counts by actual posting date."/>
      </div>
      <AnalyticsSection title="Applicant demographics">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2"><AnalyticsChart title="Recorded gender" kind="donut" rows={data.demographics.gender} hint="One count per applicant. Missing values remain unknown."/><AnalyticsChart title="Educational attainment" kind="columns" rows={data.demographics.education} hint="One count per applicant in the selected registration cohort."/><AnalyticsChart title="Barangay distribution" rows={data.demographics.barangay} hint="Official Lipa names; other or historical spellings are grouped separately. Chart shows the top 10; exact values include all categories."/><AnalyticsChart title="Latest application status" kind="donut" rows={data.demographics.status} hint="Current status of each applicant’s latest application; not a historical employment rate."/></div>
      </AnalyticsSection>
      <AnalyticsSection title="Job demand details">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2"><AnalyticsChart title="Recorded job status" kind="donut" rows={data.demand.status} hint="Current recorded listing status within the posting cohort. Available positions exclude filled and expired listings."/><AnalyticsChart title="Listings by industry" rows={data.demand.industry} hint="Distinct job listings, not the number of positions. Top 10 shown."/><AnalyticsChart title="Most listed job positions" rows={data.demand.positions} hint="Distinct listing IDs grouped by recorded job title. Top 10 shown."/></div>
      <div className="mt-3"><AnalyticsChart title="Listings by company" rows={data.demand.company} hint="Distinct listings by company in the selected posting cohort. Top 10 shown."/></div>
      </AnalyticsSection>
      <AnalyticsSection title="Common skills">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2"><AnalyticsChart title="Required hard skills · top 10" rows={data.skills.hard} hint="Count of distinct selected job listings requiring each skill. Repeated entries within a listing count once."/><AnalyticsChart title="Required soft skills · top 10" rows={data.skills.soft} hint="Count of distinct selected job listings requiring each skill. Hard and soft skills are counted separately."/><AnalyticsChart title="Missing hard skills · top 10" rows={data.skills.missingHard} hint="Distinct applicants with each saved gap, across selected available jobs scoring at least 60%. Not all applicants or all jobs."/><AnalyticsChart title="Missing soft skills · top 10" rows={data.skills.missingSoft} hint="Distinct applicants with each saved gap. Repeated gaps across jobs count once per applicant; no new NLP calculation is performed."/></div>
      </AnalyticsSection>
      <details className="text-xs text-slate-500"><summary className="cursor-pointer py-1">{pt('How these counts work')}</summary><div className="mt-2 space-y-2 leading-5">
        <p>{pt('Dates use Asia/Manila. Applicants are grouped by registration date; jobs by posting date. Current status and remaining positions are snapshots, not historical totals.')}</p>
        <p>{pt('Undated records are excluded from date-based reports. These charts read saved records and do not generate Gemini recommendations.')}</p>
        <p>{pt('{listings} available listings · {pairs} saved applicant–job matches', { listings: data.totals.availableListings, pairs: data.totals.matchPairs })} · {new Date(data.generatedAt).toLocaleString()}</p>
      </div></details>
    </>}
    </div>
    {sidebar && <aside aria-label={pt('Dashboard shortcuts and activities')} className="min-w-0 space-y-3">{sidebar}</aside>}
    </div>
  </section>
}
