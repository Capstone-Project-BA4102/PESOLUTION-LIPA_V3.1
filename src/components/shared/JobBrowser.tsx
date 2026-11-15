import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { JobQualifications } from './JobQualifications'
import { useMemo, useState, type ReactNode } from 'react'
import { Banknote, BriefcaseBusiness, CheckCircle2, MapPin, Search, XCircle } from 'lucide-react'
import type { Job } from '@/lib/api'
import { fetchJobs } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { peso } from '@/lib/utils'
import { Alert, Button, Card, EmptyState, SearchInput, Select } from '@/components/ui'
import { JobLogo } from '@/components/shared/JobLogo'
import { ErrorBlock } from '@/components/shared/QueryState'
import { JobBrowserSkeleton } from '@/components/shared/Skeletons'
import { EMPLOYMENT_TYPES, INDUSTRIES, WORK_SETUPS } from '@/constants/options'
import { usePT } from '@/lib/portalCopy'

/** Job card used on BOTH the public Job Opportunities page and the Applicant portal. */
type SkillState = 'matched' | 'missing' | undefined

export function JobCard({ job, onView, actions, meta, getSkillState }: { job: Job; onView?: (job: Job) => void; actions?: ReactNode; meta?: ReactNode; getSkillState?: (skill: string) => SkillState }) {
  const pt = usePT()
  const unit = job.salaryUnit === 'day' ? pt(' / day') : ''
  const lastSlot = job.vacancies === 1
  const slotsLabel = job.vacancies > 0
    ? pt(lastSlot ? '{count} open slot left' : '{count} open slots', { count: job.vacancies })
    : ''
  const postedLabel = job.datePosted ? pt('Posted {date}', { date: job.datePosted }) : ''
  return <Card className="flex h-full min-w-0 flex-col gap-3 p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <JobLogo name={job.company} src={job.companyLogo} size="sm" />
        <div className="min-w-0">
          <h3 className="text-[16px] leading-snug font-semibold break-words text-slate-900">{job.title}</h3>
          <p className="mt-0.5 text-[13px] leading-snug break-words text-slate-600">{job.company}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {slotsLabel && <span className={lastSlot
          ? 'inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-[11.5px] font-bold text-warning-700 ring-1 ring-warning-200'
          : 'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600'}>
          {lastSlot && <span className="h-1.5 w-1.5 rounded-full bg-warning-600" aria-hidden="true" />}
          {slotsLabel}
        </span>}
      </div>
    </div>
    <ul className="space-y-1.5 text-[13px] text-slate-600">
      <li className="flex items-start gap-2">
        <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 break-words">{job.location}</span>
      </li>
      <li className="flex items-start gap-2">
        <BriefcaseBusiness aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 break-words">{job.employmentType}{job.workSetup ? ` · ${job.workSetup}` : ''}</span>
      </li>
      <li className="flex items-start gap-2">
        <Banknote aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 break-words">{peso(job.salaryMin)} – {peso(job.salaryMax)}{unit}</span>
      </li>
    </ul>
    <div><JobQualifications job={job} getSkillState={getSkillState} /></div>
    <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        {meta}
        {postedLabel && <span className="text-[12px] text-slate-500">{postedLabel}</span>}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {actions}
        <Button size="sm" variant="primary" onClick={() => onView?.(job)}>
          {pt('View Details')}
        </Button>
      </span>
    </footer>
  </Card>
}

/** Filter card + list of job cards. Shared by public and applicant job pages. */
export function JobBrowser({
  onView,
  allowedIds,
  getActions,
  getMeta,
  getSkillState,
  showHowToApply = true,
  refreshKey = 0,
}: {
  onView?: (job: Job) => void
  allowedIds?: string[]
  getActions?: (job: Job) => ReactNode
  getMeta?: (job: Job) => ReactNode
  getSkillState?: (job: Job, skill: string) => SkillState
  refreshKey?: string | number
  showHowToApply?: boolean
}) {
  const pt = usePT()
  const { data: allJobs, loading, refreshing, error, reload } = useQuery(fetchJobs, [refreshKey])
  useLiveRefresh(reload, ['job_listings'])
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [setup, setSetup] = useState('')
  const [industry, setIndustry] = useState('')
  const [applied, setApplied] = useState({ q: '', type: '', setup: '', industry: '' })

  const list = useMemo(() => {
    const filtered = (allJobs || []).filter(
      (j) =>
        j.status === 'Active' &&
        (!allowedIds || allowedIds.includes(j.id)) &&
        (!applied.q || `${j.title} ${j.company} ${(j.hardSkills || []).join(' ')}`.toLowerCase().includes(applied.q.toLowerCase())) &&
        (!applied.type || j.employmentType === applied.type) &&
        (!applied.setup || j.workSetup === applied.setup) &&
        (!applied.industry || j.industry === applied.industry),
    )
    if (allowedIds) filtered.sort((a, b) => allowedIds.indexOf(a.id) - allowedIds.indexOf(b.id))
    return filtered
  }, [allJobs, applied, allowedIds])

  if (loading && !allJobs) return <JobBrowserSkeleton label={pt('Loading jobs...')} />
  if (error && !allJobs) return <ErrorBlock message={error} onRetry={reload} />

  return (
    <>
      <RefreshNotice error={error} refreshing={refreshing} retry={reload} />
      <Card className="mb-4 p-4">
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setApplied({ q, type, setup, industry })
          }}
        >
          <SearchInput placeholder="Search job title, company, or skill…" value={q} onChange={(e) => setQ(e.target.value)} aria-label={pt('Search jobs')} />
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select placeholder="All Types" options={EMPLOYMENT_TYPES} value={type} onChange={(e) => setType(e.target.value)} />
            <Select placeholder="All Setups" options={WORK_SETUPS} value={setup} onChange={(e) => setSetup(e.target.value)} />
            <Select placeholder="All Industries" options={INDUSTRIES} value={industry} onChange={(e) => setIndustry(e.target.value)} />
            <Button type="submit" icon={<Search className="h-5 w-5" />} fullWidth>
              Search
            </Button>
          </div>
        </form>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-slate-600"><b className="text-slate-900">{list.length}</b> {pt(list.length === 1 ? 'job found' : 'jobs found')}</p>
        {getSkillState && <div className="flex flex-wrap items-center gap-3 text-[11.5px] font-semibold text-slate-600" aria-label={pt('Skill requirement legend')}>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success-600" />{pt('Matched')}</span>
          <span className="inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-warning-600" />Skill gap</span>
        </div>}
      </div>
      <div className="flex flex-col gap-3">
        {list.map((j) => (
          <JobCard key={j.id} job={j} onView={onView} actions={getActions?.(j)} meta={getMeta?.(j)} getSkillState={getSkillState ? skill => getSkillState(j, skill) : undefined} />
        ))}
        {list.length === 0 && (
          <Card>
            <EmptyState icon={<Search />} title="No jobs found" description="Try a different keyword or clear the filters." />
          </Card>
        )}
      </div>
      {showHowToApply && (
        <Alert tone="info" className="mt-4" title="How to apply">
          {pt('Visit the PESO Lipa office at City Hall with your resume and a valid ID. Our staff will assist you with the referral.')}
        </Alert>
      )}
    </>
  )
}



