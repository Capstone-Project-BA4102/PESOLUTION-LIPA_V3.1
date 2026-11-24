import { Fragment, useCallback, useMemo, useState, type ReactNode } from 'react'
import { Inbox, MapPin, Search, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, SearchInput, Select } from '@/components/ui'
import { ErrorBlock } from '@/components/shared/QueryState'
import { MatchResultsSkeleton } from '@/components/shared/Skeletons'
import { MatchInsights } from '@/components/features/MatchInsights'
import { ApplicantMatchCard } from '@/components/applicant/ApplicantMatchCard'
import { MATCH_THRESHOLD } from '@/components/matching/matchTones'
import { MatchWeightsLegend } from '@/components/matching/MatchVisuals'
import { useAuth } from '@/lib/auth'
import { fetchApplicantMatchedJobs, fetchJobs, refreshOwnApplicantMatching, type ApplicantJobMatch, type ApplicantJobsData, type Job } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useReactiveMatching } from '@/lib/useReactiveMatching'
import { withMatchEvidence } from '@/lib/matchEvidence'
import { rankedMatches } from '@/lib/prescriptiveAnalytics'
import { EMPLOYMENT_TYPES, INDUSTRIES, WORK_SETUPS } from '@/constants/options'
import { usePT } from '@/lib/portalCopy'
import { peso } from '@/lib/utils'

const EMPTY_FILTERS = { q: '', type: '', setup: '', industry: '' }

export default function ApplicantJobs() {
  const { user } = useAuth()
  const email = user?.email
  const pt = usePT()

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [draft, setDraft] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState(EMPTY_FILTERS)

  const fetcher = useCallback(async () => {
    if (!email) return { applicantId: '', matchedJobs: [], activeRequests: 0 }
    const result = await fetchApplicantMatchedJobs(email)
    setSelectedJobId(previous => result.matchedJobs.some(match => match.jobId === previous) ? previous : null)
    return result
  }, [email])
  const initial = useQuery<ApplicantJobsData>(fetcher, [email])
  const live = useReactiveMatching<ApplicantJobsData>(initial.data?.applicantId || '', { load: fetcher, run: refreshOwnApplicantMatching })
  const data = live.data || initial.data
  const error = live.error || initial.error
  const matching = live.matching
  const checking = !!data?.applicantId && live.loading
  const reload = () => data?.applicantId ? live.refresh(false) : initial.reload()

  const jobsQuery = useQuery(fetchJobs, [matching?.checkedAt || 0])
  const jobsById = useMemo(() => Object.fromEntries((jobsQuery.data || []).map((job: Job) => [job.id, job])) as Record<string, Job>, [jobsQuery.data])
  const ranked = useMemo(() => rankedMatches(data?.matchedJobs || []), [data])

  const visible = useMemo(() => {
    const needle = applied.q.trim().toLowerCase()
    return ranked.filter(match => {
      const job = jobsById[match.jobId]
      const haystack = [match.audit.title, match.audit.company, ...(job?.hardSkills || []), ...(job?.softSkills || [])].join(' ').toLowerCase()
      const matchesJob = !job || (
        (!applied.type || job.employmentType === applied.type) &&
        (!applied.setup || job.workSetup === applied.setup) &&
        (!applied.industry || job.industry === applied.industry)
      )
      return (!needle || haystack.includes(needle)) && matchesJob
    })
  }, [ranked, jobsById, applied])

  if (initial.loading && !data) return <MatchResultsSkeleton label={pt('Loading matched jobs...')} />
  if (!data) return <ErrorBlock message={error || pt('Applicant not found')} onRetry={reload} />

  const matchedJobs = data.matchedJobs
  const byJobId: Record<string, ApplicantJobMatch> = {}
  for (const match of matchedJobs) byJobId[match.jobId] = { ...match, audit: {
    ...withMatchEvidence(match.audit, matching),
  } }
  const selectedMatch = selectedJobId ? byJobId[selectedJobId] : undefined
  const selectedJob = selectedJobId ? jobsById[selectedJobId] : undefined
  const modalMeta: ReactNode[] = []
  if (selectedMatch) {
    if (selectedMatch.audit.location) modalMeta.push(<span key="location" className="inline-flex min-w-0 items-center gap-1"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />{selectedMatch.audit.location}</span>)
    if (selectedMatch.audit.employmentType) modalMeta.push(<span key="type">{pt(selectedMatch.audit.employmentType)}</span>)
    if (selectedJob) modalMeta.push(<span key="salary">{peso(selectedJob.salaryMin)} – {peso(selectedJob.salaryMax)}{selectedJob.salaryUnit === 'day' ? pt(' / day') : ''}</span>)
  }
  const refreshKey = matching?.checkedAt ? Date.parse(matching.checkedAt) : 0
  const filtered = Object.values(applied).some(Boolean)
  const cutoffLabel = pt('{threshold}% matching cutoff', { threshold: MATCH_THRESHOLD })
  const weightLabels = { hard: `${pt('Hard Skills')} · 50%`, soft: `${pt('Soft Skills')} · 30%`, education: `${pt('Education')} · 20%` }

  const statusTone = error || live.realtime === 'offline' ? 'warning' : checking ? 'info' : live.realtime === 'live' ? 'success' : 'neutral'
  const statusText = error ? pt('Automatic updates unavailable.')
    : checking ? pt('Checking for matching updates…')
    : live.realtime === 'offline' ? pt('Offline — showing saved results.')
    : live.realtime === 'live' ? pt('Auto-updated (Realtime)')
    : pt('Results update automatically when applicant skills or job requirements change.')
  const statusClass = {
    success: 'border-success-100 bg-success-50 text-success-700',
    warning: 'border-warning-100 bg-warning-50 text-warning-700',
    info: 'border-info-100 bg-info-50 text-info-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  }[statusTone]
  const statusDot = {
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    info: 'bg-info-600',
    neutral: 'bg-slate-400',
  }[statusTone]

  return (
    <div className="space-y-4">
      <PageHeader title="Matched Jobs" description="View matched jobs and compatibility results. Contact PESO staff for official referral processing." />

      {error && <div role="alert" className="rounded-lg border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700">
        <p>{error}</p><Button size="sm" variant="neutral" disabled={checking} onClick={reload}>{pt('Retry')}</Button>
      </div>}
      {matching?.aiDegraded && <p role="status" className="rounded-lg border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700">{pt('Skill comparison by meaning is temporarily unavailable. These results use exact skill matches. Training suggestions are based on the listed skill gaps.')}</p>}

      {ranked.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-info-100 bg-info-50 p-4 text-sm text-info-700">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-info-100 bg-white/60">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{pt(checking ? 'Checking for matching updates…' : 'No active jobs meet the 60% matching cutoff.')}</p>
            <p className="mt-0.5 opacity-90">{pt('Results update automatically when applicant skills or job requirements change.')}</p>
          </div>
        </div>
      ) : (
        <>
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-success-50 text-success-700 ring-1 ring-success-100"><Sparkles className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h2 className="text-[16px] font-semibold text-slate-900">{pt(ranked.length === 1 ? 'PESO matched you with {count} job opportunity.' : 'PESO matched you with {count} job opportunities.', { count: ranked.length })}</h2>
                  <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-slate-500">{pt('Ranked by overall compatibility. Official referrals are issued and managed by authorized PESO staff.')}</p>
                </div>
              </div>
              <p role="status" className={`inline-flex items-start gap-2 rounded-md border px-2.5 py-1 text-[11.5px] font-semibold ${statusClass}`}>
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${statusDot}`} />{statusText}
              </p>
            </div>

            <MatchWeightsLegend className="mt-4" labels={weightLabels} threshold={MATCH_THRESHOLD} thresholdLabel={cutoffLabel} />

            <form className="mt-4 grid gap-3 border-t border-slate-100 pt-4" onSubmit={event => { event.preventDefault(); setApplied(draft) }}>
              <SearchInput placeholder="Search job title, company, or skill…" value={draft.q} onChange={event => setDraft(current => ({ ...current, q: event.target.value }))} aria-label={pt('Search jobs')} />
              <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select placeholder="All Types" options={EMPLOYMENT_TYPES} value={draft.type} onChange={event => setDraft(current => ({ ...current, type: event.target.value }))} />
                <Select placeholder="All Setups" options={WORK_SETUPS} value={draft.setup} onChange={event => setDraft(current => ({ ...current, setup: event.target.value }))} />
                <Select placeholder="All Industries" options={INDUSTRIES} value={draft.industry} onChange={event => setDraft(current => ({ ...current, industry: event.target.value }))} />
                <Button type="submit" icon={<Search className="h-5 w-5" />} fullWidth>{pt('Search')}</Button>
              </div>
            </form>

            {jobsQuery.error && <p className="mt-3 border-t border-slate-100 pt-3 text-[12px] text-warning-700">{pt('Job details could not be loaded. Match scores are still shown.')}</p>}
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-slate-600">{pt('Showing {shown} of {total} matching jobs', { shown: visible.length, total: ranked.length })}</p>
            {filtered && <Button variant="ghost" size="sm" onClick={() => { setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS) }}>{pt('Clear filters')}</Button>}
          </div>

          <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
            {visible.map(match => <ApplicantMatchCard key={match.jobId} match={match} job={jobsById[match.jobId]}
              best={match.jobId === ranked[0]?.jobId} actions={match.requestStatus ? <StatusBadge status={match.requestStatus} /> : undefined}
              onView={() => setSelectedJobId(match.jobId)} />)}
            {visible.length === 0 && <Card className="md:col-span-2 xl:col-span-3">
              <EmptyState icon={<Search />} title={pt('No matching jobs for these filters')} description={pt('Clear the filters to see every job PESO matched with your profile.')} />
            </Card>}
          </div>
        </>
      )}

      <Modal open={!!selectedMatch} onClose={() => setSelectedJobId(null)} title={selectedMatch?.job?.title || 'Job Match Details'} size="lg">
        {selectedMatch && <>
          <div className="mb-4 space-y-1.5 border-b border-slate-100 pb-3">
            <p className="text-[13px] font-semibold text-brand-700">{selectedMatch.job.companies?.name || selectedMatch.audit.company}</p>
            {modalMeta.length > 0 && <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-snug text-slate-500">
              {modalMeta.map((item, index) => <Fragment key={index}>
                {index > 0 && <span className="text-slate-300" aria-hidden="true">·</span>}
                {item}
              </Fragment>)}
            </p>}
          </div>
          <MatchInsights refreshKey={refreshKey} applicantId={data?.applicantId || ''} match={selectedMatch.audit} />
        </>}
      </Modal>
    </div>
  )
}
