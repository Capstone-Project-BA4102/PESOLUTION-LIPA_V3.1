import { useCallback, useState } from 'react'
import { Inbox, Sparkles, Target } from 'lucide-react'
import { JobBrowser } from '@/components/shared/JobBrowser'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import { useAuth } from '@/lib/auth'
import { fetchApplicantMatchedJobs, refreshOwnApplicantMatching, type ApplicantJobMatch, type ApplicantJobsData, type Job } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useReactiveMatching } from '@/lib/useReactiveMatching'
import { Button } from '@/components/ui/Button'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { ApplicantMatchOverview } from '@/components/features/ApplicantMatchOverview'
import { MatchInsights } from '@/components/features/MatchInsights'
import { usePT } from '@/lib/portalCopy'

export default function ApplicantJobs() {
  const { user } = useAuth()
  const email = user?.email
  const pt = usePT()

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
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

  if (initial.loading && !data) return <LoadingBlock label={pt('Loading matched jobs...')} />
  if (!data) return <ErrorBlock message={error || pt('Applicant not found')} onRetry={reload} />

  const matchedJobs = data.matchedJobs
  const byJobId: Record<string, ApplicantJobMatch> = {}
  for (const match of matchedJobs) byJobId[match.jobId] = { ...match, audit: {
    ...match.audit, nlpAudit: matching?.jobAudits?.[match.jobId] ||
      (matching?.nlpAudit?.audit.some(row => row.job_id === match.jobId) ? matching.nlpAudit : undefined),
  } }
  const selectedMatch = selectedJobId ? byJobId[selectedJobId] : undefined
  const refreshKey = matching?.checkedAt || 0

  const getActions = (job: Job) => {
    const status = byJobId[job.id]?.requestStatus
    return status ? <StatusBadge status={status} /> : null
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Matched Jobs" description="View matched jobs and compatibility results. Contact PESO staff for official referral processing." />

      <p role="status" className="text-sm text-slate-500">{pt(error ? 'Automatic updates unavailable.' : checking ? 'Checking for matching updates…' : live.realtime === 'offline' ? 'Offline — showing saved results.' : live.realtime === 'live' ? 'Auto-updated (Realtime)' : 'Results update automatically when applicant skills or job requirements change.')}</p>
      {error && <div role="alert" className="rounded-lg border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700">
        <p>{error}</p><Button size="sm" variant="neutral" disabled={checking} onClick={reload}>{pt('Retry')}</Button>
      </div>}
      {matching?.aiDegraded && <p role="status" className="rounded-lg border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700">{pt('Local NLP was unavailable for this run. Scores and gaps use exact skill matches only. Gemini recommendations use those verified gaps.')}</p>}

      {matchedJobs.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-info-100 bg-info-50 p-4 text-sm text-info-700">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-info-100 bg-white/60">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">{pt(checking ? 'Checking for matching updates…' : 'No active jobs meet the 60% matching cutoff.')}</p>
            <p className="mt-0.5 opacity-90">{pt('Results update automatically when applicant skills or job requirements change.')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-success-100 bg-success-50 p-4 text-sm text-success-700">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-success-100 bg-white/60">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">
                {pt(matchedJobs.length === 1 ? 'PESO matched you with {count} job opportunity.' : 'PESO matched you with {count} job opportunities.', { count: matchedJobs.length })}
              </p>
              <p className="mt-0.5 opacity-90">{pt('Official referrals are issued and managed by authorized PESO staff. Existing requests remain available for staff review.')}</p>
            </div>
          </div>


          <ApplicantMatchOverview matches={matchedJobs} onSelect={setSelectedJobId} />
          <JobBrowser refreshKey={refreshKey} allowedIds={matchedJobs.map(m => m.jobId)} getActions={getActions}
            getMeta={job => <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-700"><Target className="h-4 w-4" />{byJobId[job.id].audit.score}% {pt('Match')}</span>}
            getSkillState={(job, skill) => {
              const audit = byJobId[job.id]?.audit
              const key = skill.trim().toLowerCase()
              if ([...(audit?.matchedHardSkills || []), ...(audit?.matchedSoftSkills || [])].some(item => item.trim().toLowerCase() === key)) return 'matched'
              if ([...(audit?.missingHardSkills || []), ...(audit?.missingSoftSkills || [])].some(item => item.trim().toLowerCase() === key)) return 'missing'
              return undefined
            }}
            onView={job => setSelectedJobId(job.id)} showHowToApply={false} />
        </>
      )}

      <Modal open={!!selectedMatch} onClose={() => setSelectedJobId(null)} title={selectedMatch?.job?.title || 'Job Match Details'} size="lg">
        {selectedMatch && <>
          <p className="text-sm font-semibold text-brand-700">{selectedMatch.job.companies?.name}</p>
          <MatchInsights refreshKey={matching?.checkedAt ? Date.parse(matching.checkedAt) : 0} applicantId={data?.applicantId || ''} match={selectedMatch.audit} />
        </>}
      </Modal>

    </div>
  )
}
