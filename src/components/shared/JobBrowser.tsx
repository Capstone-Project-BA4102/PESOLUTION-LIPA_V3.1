import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { JobQualifications } from './JobQualifications'
import { useMemo, useState, type ReactNode } from 'react'
import { Briefcase, CheckCircle2, Clock, MapPin, Search, Wallet, XCircle } from 'lucide-react'
import type { Job } from '@/lib/api'
import { fetchJobs } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { peso } from '@/lib/utils'
import { Alert, Button, Card, EmptyState, IconBox, SearchInput, Select } from '@/components/ui'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { EMPLOYMENT_TYPES, INDUSTRIES, WORK_SETUPS } from '@/constants/options'
import { usePT } from '@/lib/portalCopy'

/** Job card used on BOTH the public Job Opportunities page and the Applicant portal. */
type SkillState = 'matched' | 'missing' | undefined

export function JobCard({ job, onView, actions, meta, getSkillState }: { job: Job; onView?: (job: Job) => void; actions?: ReactNode; meta?: ReactNode; getSkillState?: (skill: string) => SkillState }) {
  const pt = usePT()
  const unit = job.salaryUnit === 'day' ? pt(' / day') : ''
  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      {job.companyLogo
        ? <img src={job.companyLogo} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1.5" />
        : <IconBox size="lg">
            <Briefcase />
          </IconBox>}
      <div className="min-w-0 flex-1">
        <h3 className="text-2xl font-black text-slate-900">{job.title}</h3>
        <p className="text-lg font-bold text-brand-700">{job.company}</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-slate-600">
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-5 w-5" />{job.location}</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="h-5 w-5" />{job.employmentType}</span>
          <span className="inline-flex items-center gap-1.5"><Wallet className="h-5 w-5" />{peso(job.salaryMin)} – {peso(job.salaryMax)}{unit}</span>
        </div>
        <div className="mt-3"><JobQualifications job={job} getSkillState={getSkillState} /></div>
      </div>
      <div className="flex w-full shrink-0 flex-col items-end gap-3 sm:w-auto">
        {meta}
        <div className="text-right">
          <p className="text-3xl font-black text-brand-600">{job.vacancies}</p>
          <p className="font-semibold text-slate-500">{pt('Vacancies')}</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-3 sm:justify-end">
          {actions}
          <Button size="sm" variant="secondary" onClick={() => onView?.(job)}>
            View Details
          </Button>
        </div>
      </div>
    </Card>
  )
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

  if (loading && !allJobs) return <LoadingBlock label={pt('Loading jobs...')} />
  if (error && !allJobs) return <ErrorBlock message={error} onRetry={reload} />

  return (
    <>
      <RefreshNotice error={error} refreshing={refreshing} retry={reload} />
      <Card className="mb-6 p-5">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            setApplied({ q, type, setup, industry })
          }}
        >
          <SearchInput placeholder="Search job title, company, or skill…" value={q} onChange={(e) => setQ(e.target.value)} aria-label={pt('Search jobs')} />
          <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <p className="text-lg text-slate-600"><b className="text-slate-900">{list.length}</b> {pt(list.length === 1 ? 'job found' : 'jobs found')}</p>
        {getSkillState && <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600" aria-label={pt('Skill requirement legend')}>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success-600" />{pt('Matched')}</span>
          <span className="inline-flex items-center gap-1.5"><XCircle className="h-4 w-4 text-warning-600" />Skill gap</span>
        </div>}
      </div>
      <div className="flex flex-col gap-4">
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
        <Alert tone="info" className="mt-6" title="How to apply">
          {pt('Visit the PESO Lipa office at City Hall with your resume and a valid ID. Our staff will assist you with the referral.')}
        </Alert>
      )}
    </>
  )
}



